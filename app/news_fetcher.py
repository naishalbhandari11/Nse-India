"""
news_fetcher.py — Serves news from DB only.
News is populated by running: python fetch_news.py
"""
import logging
from typing import List, Dict
from app.database import get_db, return_db

logger = logging.getLogger(__name__)


def get_symbol_news(symbol: str, limit: int = 8) -> List[Dict]:
    """
    Serve news for a symbol from DB (populated by fetch_news.py).
    Returns empty list if no news found — frontend shows 'no news' state.
    """
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT na.title, na.description, na.url, na.source, na.published_date
            FROM stock_news sn
            JOIN news_articles na ON na.id = sn.news_id
            WHERE sn.symbol = %s
            ORDER BY na.created_at DESC
            LIMIT %s
        """, (symbol, limit))
        rows = cur.fetchall()
        return [
            {
                "title":          r[0],
                "summary":        r[1],   # description → summary for frontend
                "url":            r[2],
                "source":         r[3],
                "published_date": r[4],
            }
            for r in rows
        ]
    except Exception as e:
        logger.error(f"[NEWS] DB load error for {symbol}: {e}")
        return []
    finally:
        cur.close()
        return_db(conn)


def clear_news_cache(symbol: str = None) -> None:
    """No-op — cache is now managed by fetch_news.py script."""
    logger.info(f"[NEWS] clear_news_cache called (no-op): {symbol or 'ALL'}")


def truncate_news_tables() -> None:
    """Truncate both news tables. Called by fetch_news.py, not on startup."""
    conn = get_db()
    cur = conn.cursor()
    try:
        cur.execute("TRUNCATE TABLE stock_news, news_articles RESTART IDENTITY CASCADE")
        conn.commit()
        logger.info("[NEWS] Truncated stock_news + news_articles")
    except Exception as e:
        conn.rollback()
        logger.warning(f"[NEWS] Could not truncate: {e}")
    finally:
        cur.close()
        return_db(conn)


def update_all_news() -> Dict[str, int]:
    """Legacy stub."""
    return {"fetched": 0, "saved": 0, "matched": 0}
