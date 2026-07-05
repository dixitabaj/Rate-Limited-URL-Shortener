import sqlite3

# Database path
DB_PATH = "shortener.db"


def get_db():
    """Open a new SQLite connection with row access by column name."""
    conn = sqlite3.connect(DB_PATH) # Connect to the SQLite database at the specified path.
    conn.row_factory = sqlite3.Row # Set the row factory to sqlite3.Row to allow access to columns by name.
    return conn


def init_db():
    """Create the urls and clicks tables if they don't already exist."""
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS urls (
            alias TEXT PRIMARY KEY,
            long_url TEXT NOT NULL,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS clicks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            alias TEXT NOT NULL,
            clicked_at TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()