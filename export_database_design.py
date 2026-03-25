"""
Export PostgreSQL public schema (table, column, data type) to an Excel file.
Loads DB settings from .env (DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD).
"""
import os

import pandas as pd
import psycopg2
from dotenv import load_dotenv

OUTPUT_FILE = "database_design.xlsx"


def main():
    load_dotenv()
    conn = psycopg2.connect(
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        database=os.getenv("DB_NAME", "NseStock"),
        user=os.getenv("DB_USER", "postgres"),
        password=os.getenv("DB_PASSWORD", ""),
    )
    query = """
    SELECT c.relname AS table_name,
           a.attname AS column_name,
           pg_catalog.format_type(a.atttypid, a.atttypmod) AS data_type
    FROM pg_catalog.pg_attribute a
    JOIN pg_catalog.pg_class c ON a.attrelid = c.oid
    JOIN pg_catalog.pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'public'
      AND c.relkind = 'r'
      AND a.attnum > 0
      AND NOT a.attisdropped
    ORDER BY c.relname, a.attnum;
    """
    cur = conn.cursor()
    cur.execute(query)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    df = pd.DataFrame(rows, columns=["Table", "Column", "Data type"])
    out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), OUTPUT_FILE)
    df.to_excel(out_path, index=False, engine="openpyxl")
    print(f"Wrote {len(df)} rows to {out_path}")


if __name__ == "__main__":
    main()
