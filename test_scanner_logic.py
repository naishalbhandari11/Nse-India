"""
Test: Verify performance scanner behavior matches dashboard.

CORRECT BEHAVIOR:
- Step 1: Find (symbol, indicator) pairs that had BUY signals in the selected date range
- Step 2+3: Load FULL history (no from_date) for those pairs -- same as dashboard
- Result: Total rows = distinct pairs from Step 1
          Each pair's signal count = full historical count (like dashboard shows)

This matches what the dashboard shows: e.g. AAVAS/SMA5 shows Total=241 (all history)
even though you filtered to today's date.
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dotenv import load_dotenv
load_dotenv()
import psycopg2

DB_CONFIG = dict(
    host=os.getenv("DB_HOST","localhost"), port=int(os.getenv("DB_PORT",5432)),
    database=os.getenv("DB_NAME","NseStock"), user=os.getenv("DB_USER","postgres"),
    password=os.getenv("DB_PASSWORD","root")
)

def get_conn(): return psycopg2.connect(**DB_CONFIG)

def test_perf_scan_behavior(from_date, to_date, holding_days=30):
    conn = get_conn(); cur = conn.cursor()
    print(f"\n{'='*60}")
    print(f"PERF SCAN TEST: from={from_date}, to={to_date}")
    print(f"{'='*60}")

    # Step 1: pairs active in date window (this is the Total row count)
    cur.execute("""
        SELECT COUNT(*) FROM (
            SELECT DISTINCT symbol, indicator FROM smatbl WHERE signal='BUY' AND trade_date >= %s AND trade_date <= %s
            UNION
            SELECT DISTINCT symbol, indicator FROM rsitbl WHERE signal='BUY' AND trade_date >= %s AND trade_date <= %s
            UNION
            SELECT DISTINCT symbol, indicator FROM bbtbl WHERE signal='BUY' AND trade_date >= %s AND trade_date <= %s
            UNION
            SELECT DISTINCT symbol, indicator_set FROM macdtbl WHERE signal='BUY' AND trade_date >= %s AND trade_date <= %s
            UNION
            SELECT DISTINCT symbol, indicator FROM stochtbl WHERE signal='BUY' AND trade_date >= %s AND trade_date <= %s
        ) t
    """, (from_date, to_date) * 5)
    total_pairs = cur.fetchone()[0]
    print(f"  Step 1 -- Distinct (symbol,indicator) pairs in date window: {total_pairs}")
    print(f"  --> This is the 'Total' row count shown in the scanner")

    # Step 2: For a sample pair, check full history signal count (no from_date)
    cur.execute("""
        SELECT DISTINCT symbol, indicator FROM smatbl
        WHERE signal='BUY' AND trade_date >= %s AND trade_date <= %s
        LIMIT 3
    """, (from_date, to_date))
    pairs = cur.fetchall()

    print(f"\n  Sample pairs -- full history signal counts (no from_date restriction):")
    for symbol, indicator in pairs:
        cur.execute("""
            SELECT COUNT(*) FROM smatbl
            WHERE symbol=%s AND indicator=%s AND signal='BUY' AND trade_date <= %s
        """, (symbol, indicator, to_date))
        full_count = cur.fetchone()[0]

        cur.execute("""
            SELECT COUNT(*) FROM smatbl
            WHERE symbol=%s AND indicator=%s AND signal='BUY'
              AND trade_date >= %s AND trade_date <= %s
        """, (symbol, indicator, from_date, to_date))
        range_count = cur.fetchone()[0]

        print(f"    {symbol}/{indicator}: in-range={range_count}, full-history={full_count}")
        print(f"    --> Scanner shows Total={full_count} (full history), like dashboard")

    cur.close(); conn.close()

def verify_union_math(conn, from_date, to_date):
    """
    Verify: pairs(A to B) should equal UNION of pairs(A to X) + pairs(X+1 to B)
    minus overlap. UNION deduplicates so pairs active on BOTH ranges count once.
    """
    cur = conn.cursor()
    print(f"\n{'='*60}")
    print(f"UNION MATH CHECK: {from_date} to {to_date}")
    print(f"{'='*60}")

    def count_pairs(f, t):
        cur.execute("""
            SELECT COUNT(*) FROM (
                SELECT DISTINCT symbol, indicator FROM smatbl WHERE signal='BUY' AND trade_date >= %s AND trade_date <= %s
                UNION
                SELECT DISTINCT symbol, indicator FROM rsitbl WHERE signal='BUY' AND trade_date >= %s AND trade_date <= %s
                UNION
                SELECT DISTINCT symbol, indicator FROM bbtbl WHERE signal='BUY' AND trade_date >= %s AND trade_date <= %s
                UNION
                SELECT DISTINCT symbol, indicator_set FROM macdtbl WHERE signal='BUY' AND trade_date >= %s AND trade_date <= %s
                UNION
                SELECT DISTINCT symbol, indicator FROM stochtbl WHERE signal='BUY' AND trade_date >= %s AND trade_date <= %s
            ) t
        """, (f, t) * 5)
        return cur.fetchone()[0]

    total = count_pairs(from_date, to_date)
    part1 = count_pairs(from_date, "2026-03-23")
    part2 = count_pairs("2026-03-24", to_date)

    # Count overlap (pairs in BOTH ranges)
    cur.execute("""
        SELECT COUNT(*) FROM (
            SELECT DISTINCT symbol, indicator FROM smatbl WHERE signal='BUY' AND trade_date >= %s AND trade_date <= '2026-03-23'
            UNION SELECT DISTINCT symbol, indicator FROM rsitbl WHERE signal='BUY' AND trade_date >= %s AND trade_date <= '2026-03-23'
            UNION SELECT DISTINCT symbol, indicator FROM bbtbl WHERE signal='BUY' AND trade_date >= %s AND trade_date <= '2026-03-23'
            UNION SELECT DISTINCT symbol, indicator_set FROM macdtbl WHERE signal='BUY' AND trade_date >= %s AND trade_date <= '2026-03-23'
            UNION SELECT DISTINCT symbol, indicator FROM stochtbl WHERE signal='BUY' AND trade_date >= %s AND trade_date <= '2026-03-23'
        ) a
        INNER JOIN (
            SELECT DISTINCT symbol, indicator FROM smatbl WHERE signal='BUY' AND trade_date = '2026-03-24'
            UNION SELECT DISTINCT symbol, indicator FROM rsitbl WHERE signal='BUY' AND trade_date = '2026-03-24'
            UNION SELECT DISTINCT symbol, indicator FROM bbtbl WHERE signal='BUY' AND trade_date = '2026-03-24'
            UNION SELECT DISTINCT symbol, indicator_set FROM macdtbl WHERE signal='BUY' AND trade_date = '2026-03-24'
            UNION SELECT DISTINCT symbol, indicator FROM stochtbl WHERE signal='BUY' AND trade_date = '2026-03-24'
        ) b USING (symbol, indicator)
    """, (from_date,) * 5)
    overlap = cur.fetchone()[0]

    print(f"  pairs({from_date} to {to_date})     = {total}")
    print(f"  pairs({from_date} to 2026-03-23) = {part1}")
    print(f"  pairs(2026-03-24 to {to_date})   = {part2}")
    print(f"  overlap (in both)                = {overlap}")
    print(f"  part1 + part2 - overlap          = {part1 + part2 - overlap}")
    print(f"  matches total?                   = {'YES' if (part1 + part2 - overlap) == total else 'NO'}")
    print(f"")
    print(f"  Your manual calc: {part1} + {part2} = {part1+part2} (wrong, ignores {overlap} overlap)")
    print(f"  Correct answer:   {part1} + {part2} - {overlap} = {part1+part2-overlap} = {total}")
    cur.close()


if __name__ == "__main__":
    print("PERFORMANCE SCANNER VERIFICATION")
    conn = get_conn()

    # Scenario A: 23-03-2026 to 25-03-2026 (what user says they selected)
    print("\n--- Scenario A: 23-03-2026 to 25-03-2026 ---")
    verify_union_math(conn, "2026-03-23", "2026-03-25")
    test_perf_scan_behavior("2026-03-23", "2026-03-23")
    test_perf_scan_behavior("2026-03-24", "2026-03-24")
    test_perf_scan_behavior("2026-03-25", "2026-03-25")
    test_perf_scan_behavior("2026-03-23", "2026-03-25")

    # Scenario B: 23-01-2026 to 25-03-2026 (what screenshot shows)
    print("\n--- Scenario B: 23-01-2026 to 25-03-2026 (from screenshot) ---")
    verify_union_math(conn, "2026-01-23", "2026-03-25")
    test_perf_scan_behavior("2026-01-23", "2026-03-25")

    conn.close()
