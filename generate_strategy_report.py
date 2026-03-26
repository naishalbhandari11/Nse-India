import pandas as pd
import numpy as np
import psycopg2
import os
from dotenv import load_dotenv
load_dotenv()
from datetime import datetime
import time

def generate_report():
    print("🚀 Starting Company-Wise Strategy Performance Report...")
    start_time = time.time()
    
    # 1. Load Signals
    signals_file = "exports/All_BUY_Signals_Complete.csv"
    if not os.path.exists(signals_file):
        # Try finding it if not in exact path
        print(f"⚠️ {signals_file} not found. Searching for alternatives...")
        import glob
        alternatives = glob.glob("exports/All_BUY_Signals_2016_2026_*.csv")
        if alternatives:
            signals_file = alternatives[0]
            print(f"✅ Found alternative: {signals_file}")
        else:
            print("❌ No signals file found. Please run export_all_signals.py first.")
            return

    print(f"📊 Loading signals from {signals_file}...")
    df_signals = pd.read_csv(signals_file)
    print(f"✅ Loaded {len(df_signals):,} signals.")
    
    # Pre-process signals: convert dates to datetime for sorting
    df_signals['trade_date'] = pd.to_datetime(df_signals['trade_date'])
    
    # 2. Load Price Data from DB
    print("🔗 Connecting to database to fetch price data...")
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5432)),
        dbname=os.getenv("DB_NAME", "NseStock"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "root")
    )
    query = "SELECT symbol, trade_date, close_price, high_price FROM daily_prices ORDER BY symbol, trade_date"
    print("📥 Downloading price data (this might take a moment)...")
    df_prices = pd.read_sql_query(query, conn)
    conn.close()
    
    df_prices['trade_date'] = pd.to_datetime(df_prices['trade_date'])
    df_prices['close_price'] = df_prices['close_price'].astype(float)
    df_prices['high_price'] = df_prices['high_price'].astype(float)
    
    print(f"✅ Loaded {len(df_prices):,} price points.")
    
    # 3. Build lookup structures for O(1) access
    print("🛠️ Building lookup structures...")
    # symbol -> {date: (close, high)}
    price_lookup = {}
    # symbol -> sorted list of dates (for sliding window)
    symbol_dates = {}
    # symbol -> numpy arrays of prices (for fast slicing)
    symbol_price_arrays = {}
    
    for symbol, group in df_prices.groupby('symbol'):
        sorted_group = group.sort_values('trade_date')
        dates = sorted_group['trade_date'].tolist()
        closes = sorted_group['close_price'].values
        highs = sorted_group['high_price'].values
        
        symbol_dates[symbol] = dates
        symbol_price_arrays[symbol] = {
            'dates': dates,
            'closes': closes,
            'highs': highs,
            'date_idx': {d: i for i, d in enumerate(dates)}
        }
    
    del df_prices # Free memory
    
    # 4. Process Signals
    print("⚡ Calculating performance for all signals (O(N) optimized)...")
    
    results = []
    
    # Group signals by symbol to process efficiently
    total_symbols = df_signals['symbol'].nunique()
    processed_count = 0
    
    for symbol, sym_signals in df_signals.groupby('symbol'):
        processed_count += 1
        if processed_count % 100 == 0:
            print(f"   Progress: {processed_count}/{total_symbols} companies...")
            
        if symbol not in symbol_price_arrays:
            continue
            
        prices = symbol_price_arrays[symbol]
        dates = prices['dates']
        closes = prices['closes']
        highs = prices['highs']
        date_idx = prices['date_idx']
        
        # Calculate performance for each signal
        for idx, row in sym_signals.iterrows():
            t_date = row['trade_date']
            indicator = row['indicator']
            
            if t_date not in date_idx:
                continue
                
            start_i = date_idx[t_date]
            entry_price = closes[start_i]
            target_price = entry_price * 1.05
            
            # Check window: next 30 days (excluding today)
            end_i = min(start_i + 1 + 30, len(dates))
            
            # If no data after today, it's open
            if end_i <= start_i + 1:
                is_success = None # Open
            else:
                window_highs = highs[start_i + 1:end_i]
                is_success = np.any(window_highs >= target_price)
            
            results.append({
                'symbol': symbol,
                'indicator': indicator,
                'is_success': is_success
            })
            
    df_results = pd.DataFrame(results)
    
    # 5. Aggregate Best Strategy per Company
    print("📊 Aggregating best strategies...")
    
    # Filter out open trades for success rate calculation
    df_completed = df_results[df_results['is_success'].notnull()].copy()
    df_completed['is_success'] = df_completed['is_success'].astype(bool)
    
    # Calculate success rate per company + indicator
    stats = df_completed.groupby(['symbol', 'indicator']).agg(
        total_signals=('is_success', 'count'),
        successes=('is_success', 'sum')
    ).reset_index()
    
    stats['success_rate'] = (stats['successes'] / stats['total_signals'] * 100).round(2)
    
    # For each company, find the indicator with the highest success rate
    # Ties: use the one with more signals
    stats = stats.sort_values(['symbol', 'success_rate', 'total_signals'], ascending=[True, False, False])
    best_strategies = stats.groupby('symbol').first().reset_index()
    
    # 6. Generate Markdown Report
    print("📝 Generating detailed Markdown report...")
    report_file = "company_best_strategies.md"
    
    with open(report_file, "w", encoding="utf-8") as f:
        f.write("# BEST TRADING STRATEGIES BY COMPANY (10 YEAR ANALYSIS)\n")
        f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
        f.write("## Overview\n")
        f.write(f"- **Total Companies:** {len(best_strategies):,}\n")
        f.write(f"- **Total Signals Analyzed:** {len(df_results):,}\n")
        f.write("- **Criteria:** Target 5% profit within 30 days.\n")
        f.write("- **Data Range:** 2016 - 2026 (Historical Backtest)\n\n")
        
        f.write("## Strategy Rankings Table\n\n")
        f.write("| Symbol | Best Indicator | Success Rate | Total Signals | Confidence |\n")
        f.write("| :--- | :--- | :--- | :--- | :--- |\n")
        
        for _, row in best_strategies.iterrows():
            symbol = row['symbol'].replace('NSE:', '')
            indicator = row['indicator']
            rate = f"{row['success_rate']}%"
            count = row['total_signals']
            
            # Confidence rating based on signal count
            if count >= 50: confidence = "⭐⭐⭐⭐⭐"
            elif count >= 20: confidence = "⭐⭐⭐⭐"
            elif count >= 10: confidence = "⭐⭐⭐"
            elif count >= 5: confidence = "⭐⭐"
            else: confidence = "⭐"
            
            f.write(f"| {symbol} | {indicator} | {rate} | {count} | {confidence} |\n")
            
    print(f"✅ Report generated successfully: {report_file}")
    
    # Also save a summary CSV for programmatic use
    best_strategies.to_csv("best_strategies_summary.csv", index=False)
    print(f"📊 Summary CSV saved: best_strategies_summary.csv")
    
    elapsed = time.time() - start_time
    print(f"⏱️ Total processing time: {elapsed:.2f} seconds.")

if __name__ == "__main__":
    generate_report()
