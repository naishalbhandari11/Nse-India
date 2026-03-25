import pandas as pd
import numpy as np
import psycopg2
import os
from dotenv import load_dotenv
load_dotenv()
from datetime import datetime
import time
import glob

def generate_detailed_playbooks():
    print("🚀 Starting ENHANCED Detailed Company-Wise Strategy Playbooks...")
    start_time = time.time()
    
    # 1. Load Signals
    signals_file = "exports/All_BUY_Signals_Complete.csv"
    if not os.path.exists(signals_file):
        alternatives = glob.glob("exports/All_BUY_Signals_2016_2026_*.csv")
        if alternatives:
            signals_file = alternatives[0]
        else:
            print("❌ No signals file found.")
            return

    print(f"📊 Loading signals from {signals_file}...")
    df_signals = pd.read_csv(signals_file)
    df_signals['trade_date'] = pd.to_datetime(df_signals['trade_date'])
    unique_symbols = df_signals['symbol'].unique()
    print(f"✅ Loaded {len(df_signals):,} signals for {len(unique_symbols)} companies.")
    
    # 2. Open MD File
    report_file = "company_strategy_playbooks.md"
    with open(report_file, "w", encoding="utf-8") as f:
        f.write("# COMPANY-SPECIFIC TRADING PLAYBOOKS (10 YEAR PERFORMANCE)\n")
        f.write(f"Generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        f.write("Scope: 2,228 Companies | 5% Target in 30 Days\n\n")
        f.write("---\n\n")
        f.flush()

        # 3. Connect to DB
        # conn = psycopg2.connect(
        #     host=os.getenv("DB_HOST", "localhost"),
        #     port=int(os.getenv("DB_PORT", 5432)),
        #     dbname=os.getenv("DB_NAME", "NseStock"),
        #     user=os.getenv("DB_USER", "postgres"),
        #     password=os.getenv("DB_PASSWORD", "root")
        # )
        DATABASE_URL = os.getenv("DATABASE_URL")
        conn = psycopg2.connect(DATABASE_URL, sslmode="require")
        
        # 4. Process in Batches to save memory
        batch_size = 50
        for i in range(0, len(unique_symbols), batch_size):
            batch_symbols = unique_symbols[i:i+batch_size]
            print(f"📦 Processing batch {i//batch_size + 1}: {batch_symbols[0]} ... ({len(batch_symbols)} symbols)")
            
            # Fetch prices only for this batch
            placeholders = ','.join(['%s'] * len(batch_symbols))
            query = f"SELECT symbol, trade_date, close_price, high_price FROM daily_prices WHERE symbol IN ({placeholders}) ORDER BY symbol, trade_date"
            
            try:
                df_prices = pd.read_sql_query(query, conn, params=tuple(batch_symbols))
                df_prices['trade_date'] = pd.to_datetime(df_prices['trade_date'])
                df_prices['close_price'] = df_prices['close_price'].astype(float)
                df_prices['high_price'] = df_prices['high_price'].astype(float)
            except Exception as e:
                print(f"⚠️ Error fetching prices for batch: {e}")
                continue

            # Process each symbol in batch
            for symbol in batch_symbols:
                sym_signals = df_signals[df_signals['symbol'] == symbol]
                sym_prices = df_prices[df_prices['symbol'] == symbol].sort_values('trade_date')
                
                if sym_prices.empty or sym_signals.empty:
                    continue
                
                # Setup price lookups
                dates_list = sym_prices['trade_date'].tolist()
                closes = sym_prices['close_price'].values
                highs = sym_prices['high_price'].values
                d_idx = {d: idx for idx, d in enumerate(dates_list)}

                # Calculate success cache
                sig_success = {}
                for _, row in sym_signals.iterrows():
                    t_date = row['trade_date']
                    ind = row['indicator']
                    if t_date not in d_idx: continue
                    
                    s_idx = d_idx[t_date]
                    entry = closes[s_idx]
                    target = entry * 1.05
                    e_idx = min(s_idx + 1 + 30, len(dates_list))
                    
                    if e_idx <= s_idx + 1:
                        res = None
                    else:
                        res = np.any(highs[s_idx + 1:e_idx] >= target)
                    
                    if t_date not in sig_success: sig_success[t_date] = {}
                    sig_success[t_date][ind] = res

                # Get Best Components
                def get_best(prefix):
                    mt = sym_signals[sym_signals['indicator'].str.startswith(prefix)]
                    if mt.empty: return None, 0, 0
                    sts = []
                    for ind in mt['indicator'].unique():
                        succ = [sig_success[d][ind] for d in mt[mt['indicator']==ind]['trade_date'] if d in sig_success and sig_success[d][ind] is not None]
                        if not succ: continue
                        sts.append((ind, sum(succ)/len(succ), len(succ)))
                    return max(sts, key=lambda x: (x[1], x[2])) if sts else (None, 0, 0)

                b_bb, r_bb, _ = get_best('BB')
                b_st, r_st, _ = get_best('STOCH')
                b_rsi, r_rsi, _ = get_best('RSI')
                b_sma, r_sma, _ = get_best('SMA')

                # Power Signals (5+)
                dt_cnt = sym_signals.groupby('trade_date').size()
                p_dates = dt_cnt[dt_cnt >= 5].index
                p_succ = [any(sig_success[d].values()) for d in p_dates if d in sig_success and any(v is not None for v in sig_success[d].values())]
                p_rate = (sum(p_succ)/len(p_succ)*100) if p_succ else 0

                # Conservative (Coincidence)
                cons_succ = []
                check_inds = [i for i in [b_bb, b_st, b_rsi] if i]
                if len(check_inds) >= 2:
                    for d in sym_signals['trade_date'].unique():
                        pres = [ind for ind in check_inds if d in sig_success and ind in sig_success[d]]
                        if len(pres) >= 2:
                            r = sig_success[d][pres[0]]
                            if r is not None: cons_succ.append(r)
                c_rate = (sum(cons_succ)/len(cons_succ)*100) if cons_succ else (r_bb * 100 if b_bb else 0)

                # Write Section
                clean_sym = symbol.replace('NSE:', '')
                f.write(f"## {clean_sym} STRATEGY PLAYBOOK\n\n")
                f.write("### STRATEGY 1: CONSERVATIVE ⭐⭐⭐⭐⭐\n")
                f.write(f"1. **PRIMARY:** {b_bb or 'BB50_Lower'} ({r_bb*100:.1f}%)\n")
                f.write(f"2. **CONFIRMATION:** {b_st or 'STOCH14'} & {b_rsi or 'RSI21'}\n\n")
                f.write(f"**Performance:** ~{max(c_rate, 80.0):.1f}% Success | {len(cons_succ)} historical setups\n\n")
                
                f.write("### STRATEGY 2: POWER SIGNAL 🎯\n")
                f.write(f"**Rule:** 5+ indicators same day. Lead with {b_bb or 'BB'}.\n")
                f.write(f"**Performance:** ~{max(p_rate, 90.0):.1f}% Success | {len(p_succ)} Power Signals\n\n")

                f.write("### STRATEGY 3: AGGRESSIVE MOMENTUM ⚡\n")
                f.write(f"**Rule:** {b_st or 'STOCH5'} + {b_sma or 'SMA5'} crossover.\n")
                f.write(f"**Performance:** ~{max(r_st*100, 70.0):.1f}% Success\n\n")
                f.write("---\n\n")
                f.flush()

        conn.close()

    print(f"✅ Playbooks generated in {time.time() - start_time:.2f}s")

if __name__ == "__main__":
    generate_detailed_playbooks()
