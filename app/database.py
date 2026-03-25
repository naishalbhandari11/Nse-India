"""
Database connection utilities
"""

import os
import psycopg2
from psycopg2.pool import SimpleConnectionPool
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

print("CONNECTED")

# Connection pool
connection_pool = None

def init_db_pool():
    """Initialize database connection pool"""
    global connection_pool
    try:
        # connection_pool = SimpleConnectionPool(
        #     1, 20,  # min and max connections
        #     host=os.getenv("DB_HOST", "localhost"),
        #     port=int(os.getenv("DB_PORT", 5432)),
        #     database=os.getenv("DB_NAME", "NseStock"),
        #     user=os.getenv("DB_USER", "postgres"),
        #     password=os.getenv("DB_PASSWORD", "root")
        # )
        DATABASE_URL = os.getenv("DATABASE_URL")
        connection_pool = psycopg2.connect(DATABASE_URL, sslmode="require")
        print("[DB] Connection pool initialized")
        
        # Create tables if they don't exist
        create_auth_tables()
        create_news_tables()
        
    except Exception as e:
        print(f"[DB] Failed to initialize connection pool: {e}")

def get_db():
    """Get a database connection from the pool"""
    global connection_pool
    if connection_pool is None:
        init_db_pool()
    return connection_pool.getconn()

def return_db(conn):
    """Return a database connection to the pool"""
    global connection_pool
    if connection_pool:
        connection_pool.putconn(conn)

def create_auth_tables():
    """Create authentication-related tables"""
    conn = get_db()
    try:
        cur = conn.cursor()
        
        # Create users table if it doesn't exist
        cur.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id SERIAL PRIMARY KEY,
                full_name VARCHAR(100) NOT NULL,
                phone_number VARCHAR(20),
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                is_verified BOOLEAN DEFAULT FALSE,
                onboarding_completed BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Create user_otps table for OTP verification
        cur.execute("""
            CREATE TABLE IF NOT EXISTS user_otps (
                id SERIAL PRIMARY KEY,
                phone_number VARCHAR(20) NOT NULL,
                otp_code VARCHAR(6) NOT NULL,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Remove username column if it exists
        try:
            cur.execute("ALTER TABLE users DROP COLUMN IF EXISTS username")
            conn.commit()
            print("[DB] Removed username column from users table")
        except Exception as e:
            # Column might not exist
            conn.rollback()
        
        # Add onboarding_completed column if it doesn't exist
        try:
            cur.execute("ALTER TABLE users ADD COLUMN onboarding_completed BOOLEAN DEFAULT FALSE")
            conn.commit()
            print("[DB] Added onboarding_completed column to users table")
        except Exception as e:
            # Column might already exist
            conn.rollback()
        
        # Create indexes
        cur.execute("CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_users_fullname ON users(full_name)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_user_otps_phone ON user_otps(phone_number)")
        
        # Clean up expired OTPs
        cur.execute("DELETE FROM user_otps WHERE expires_at < %s", (datetime.utcnow(),))
        
        conn.commit()
        cur.close()
        return_db(conn)
        print("[DB] Authentication tables updated/verified")
        
    except Exception as e:
        print(f"[DB] Failed to update auth tables: {e}")
        try:
            cur.close()
            return_db(conn)
        except:
            pass

def create_news_tables():
    """Create news-related tables"""
    conn = get_db()
    try:
        cur = conn.cursor()
        
        # Create news_articles table
        cur.execute("""
            CREATE TABLE IF NOT EXISTS news_articles (
                id SERIAL PRIMARY KEY,
                title TEXT NOT NULL,
                summary TEXT,
                url TEXT UNIQUE NOT NULL,
                source TEXT DEFAULT 'Moneycontrol',
                published_date TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Add summary column if it doesn't exist (for existing installations)
        try:
            cur.execute("ALTER TABLE news_articles ADD COLUMN summary TEXT")
            conn.commit()
            print("[DB] Added summary column to news_articles table")
        except Exception as e:
            # Column might already exist
            conn.rollback()
        
        # Create stock_news table for symbol-news mapping
        cur.execute("""
            CREATE TABLE IF NOT EXISTS stock_news (
                id SERIAL PRIMARY KEY,
                symbol TEXT NOT NULL,
                news_id INTEGER NOT NULL,
                relevance_score REAL DEFAULT 1.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (news_id) REFERENCES news_articles (id),
                UNIQUE(symbol, news_id)
            )
        """)
        
        # Create indexes for better performance
        cur.execute("CREATE INDEX IF NOT EXISTS idx_news_articles_created_at ON news_articles(created_at)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_news_articles_source ON news_articles(source)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_stock_news_symbol ON stock_news(symbol)")
        cur.execute("CREATE INDEX IF NOT EXISTS idx_stock_news_relevance ON stock_news(relevance_score)")
        
        conn.commit()
        cur.close()
        return_db(conn)
        print("[DB] News tables created/verified")
        
    except Exception as e:
        print(f"[DB] Failed to create news tables: {e}")
        try:
            cur.close()
            return_db(conn)
        except:
            pass

# Initialize on import
init_db_pool()