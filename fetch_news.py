"""
fetch_news.py — Run this script daily to refresh news for all companies
that have BUY signals in latest_buy_signals table.

Usage:
    python fetch_news.py
    python fetch_news.py --limit 10   # fetch only 10 articles per company
    python fetch_news.py --dry-run    # show which companies would be fetched
"""

import sys
import os
import time
import argparse
import urllib.parse
import re
import logging
from datetime import datetime
from typing import List, Dict

import feedparser
import psycopg2

sys.path.insert(0, os.getcwd())
from dotenv import load_dotenv
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%H:%M:%S"
)
logger = logging.getLogger(__name__)


# ─── Helpers ─────────────────────────────────────────────────────────────────

def strip_html(text: str) -> str:
    if not text:
        return ''
    clean = re.sub(r'<[^>]+>', '', text)
    for ent, ch in [('&amp;', '&'), ('&lt;', '<'), ('&gt;', '>'),
                    ('&quot;', '"'), ('&#39;', "'"), ('&nbsp;', ' ')]:
        clean = clean.replace(ent, ch)
    return re.sub(r'\s+', ' ', clean).strip()


def company_name_from_symbol(symbol: str) -> str:
    """'NSE:RELIANCE' → 'Reliance'"""
    name = symbol.replace('NSE:', '').replace('BSE:', '').strip()
    for suffix in ['LTD', 'LIMITED', 'CORP', 'IND', 'INDS']:
        if name.upper().endswith(suffix):
            name = name[:-len(suffix)].strip()
    return name.title()


def extract_source(entry) -> str:
    try:
        return entry.source.title
    except AttributeError:
        pass
    title = entry.get('title', '')
    if ' - ' in title:
        return title.rsplit(' - ', 1)[-1].strip()
    return 'Google News'


def parse_date(date_str: str):
    if not date_str:
        return None
    formats = [
        '%a, %d %b %Y %H:%M:%S %Z',
        '%a, %d %b %Y %H:%M:%S %z',
        '%Y-%m-%dT%H:%M:%SZ',
    ]
    for fmt in formats:
        try:
            return datetime.strptime(date_str, fmt).isoformat()
        except ValueError:
            continue
    return None


def fetch_google_news(symbol: str, limit: int = 8) -> List[Dict]:
    """Fetch news from Google News RSS for a symbol."""
    company = company_name_from_symbol(symbol)
    query = urllib.parse.quote(f"{company} NSE stock India")
    url = f"https://news.google.com/rss/search?q={query}&hl=en-IN&gl=IN&ceid=IN:en"

    try:
        feed = feedparser.parse(url)
        articles = []
        for entry in feed.entries[:limit]:
            title = strip_html(entry.get('title', ''))
            if not title:
                continue
            articles.append({
                "title":          title,
                "summary":        strip_html(entry.get('summary', '')),
                "url":            entry.get('link', ''),
                "source":         extract_source(entry),
                "published_date": parse_date(entry.get('published', '')),
            })
        return articles
    except Exception as e:
        logger.error(f"  ✗ Fetch error for {symbol}: {e}")
        return []


# ─── DB operations ────────────────────────────────────────────────────────────

def get_buy_signal_symbols(conn) -> List[str]:
    """Get distinct symbols from latest_buy_signals."""
    cur = conn.cursor()
    cur.execute("SELECT DISTINCT symbol FROM latest_buy_signals ORDER BY symbol")
    symbols = [row[0] for row in cur.fetchall()]
    cur.close()
    return symbols


def truncate_news_tables(conn) -> None:
    cur = conn.cursor()
    try:
        cur.execute("TRUNCATE TABLE stock_news, news_articles RESTART IDENTITY CASCADE")
        conn.commit()
        logger.info("✓ Truncated stock_news + news_articles tables")
    except Exception as e:
        conn.rollback()
        logger.error(f"✗ Could not truncate tables: {e}")
    finally:
        cur.close()


def save_articles(conn, symbol: str, articles: List[Dict]) -> int:
    """Upsert articles into news_articles + stock_news. Returns count saved."""
    if not articles:
        return 0

    cur = conn.cursor()
    saved = 0
    try:
        for art in articles:
            if not art.get('url') or not art.get('title'):
                continue

            cur.execute("""
                INSERT INTO news_articles (title, description, url, source, published_date)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (url) DO UPDATE
                    SET title          = EXCLUDED.title,
                        description    = EXCLUDED.description,
                        source         = EXCLUDED.source,
                        published_date = EXCLUDED.published_date
                RETURNING id
            """, (
                art['title'][:500],
                (art.get('summary') or '')[:1000],
                art['url'][:1000],
                art.get('source', 'Google News')[:100],
                art.get('published_date'),
            ))
            row = cur.fetchone()
            if not row:
                cur.execute("SELECT id FROM news_articles WHERE url = %s", (art['url'][:1000],))
                row = cur.fetchone()
            if row:
                cur.execute("""
                    INSERT INTO stock_news (symbol, news_id, relevance_score)
                    VALUES (%s, %s, 1.0)
                    ON CONFLICT (symbol, news_id) DO NOTHING
                """, (symbol, row[0]))
                saved += 1

        conn.commit()
    except Exception as e:
        conn.rollback()
        logger.error(f"  ✗ DB save error for {symbol}: {e}")
    finally:
        cur.close()

    return saved


# ─── Main ─────────────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Fetch news for BUY signal companies")
    parser.add_argument('--limit',   type=int, default=8,     help="Articles per company (default: 8)")
    parser.add_argument('--delay',   type=float, default=0.5, help="Delay between requests in seconds (default: 0.5)")
    parser.add_argument('--dry-run', action='store_true',     help="Show companies without fetching")
    args = parser.parse_args()

    logger.info("=" * 60)
    logger.info("NSE News Fetcher — Daily BUY Signal Companies")
    logger.info("=" * 60)

    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=int(os.getenv("DB_PORT", 5432)),
        dbname=os.getenv("DB_NAME", "NseStock"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", "root")
    )
    logger.info("✓ Connected to database")

    # Get symbols
    symbols = get_buy_signal_symbols(conn)
    logger.info(f"✓ Found {len(symbols)} companies with BUY signals")

    if args.dry_run:
        logger.info("\nDRY RUN — companies that would be fetched:")
        for i, s in enumerate(symbols, 1):
            logger.info(f"  {i:3}. {s}")
        conn.close()
        return

    # Truncate old news
    logger.info("\nTruncating old news tables...")
    truncate_news_tables(conn)

    # Fetch news for each company
    logger.info(f"\nFetching news ({args.limit} articles each, {args.delay}s delay)...\n")
    total_saved = 0
    failed = []

    for i, symbol in enumerate(symbols, 1):
        logger.info(f"[{i:3}/{len(symbols)}] {symbol}")
        articles = fetch_google_news(symbol, args.limit)

        if articles:
            saved = save_articles(conn, symbol, articles)
            total_saved += saved
            logger.info(f"         → {saved} articles saved")
        else:
            logger.warning(f"         → No articles found")
            failed.append(symbol)

        # Polite delay to avoid hammering Google
        if i < len(symbols):
            time.sleep(args.delay)

    conn.close()

    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("DONE")
    logger.info(f"  Companies processed : {len(symbols)}")
    logger.info(f"  Total articles saved: {total_saved}")
    logger.info(f"  Failed / no news    : {len(failed)}")
    if failed:
        logger.info(f"  Failed symbols      : {', '.join(failed[:10])}" +
                    (" ..." if len(failed) > 10 else ""))
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
