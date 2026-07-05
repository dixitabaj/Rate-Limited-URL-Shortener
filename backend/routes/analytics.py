from datetime import datetime, timedelta

from flask import Blueprint, jsonify

from database.database import get_db

api = Blueprint("analytics_api", __name__)


@api.route("/api/analytics/<alias>", methods=["GET"])
def get_analytics(alias):
    """Return the last 7 days of click counts for a given alias.

    Days with no clicks are included with a count of 0, so the
    frontend gets a continuous 7-point series instead of gaps.
    """
    conn = get_db()
    seven_days_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()

    rows = conn.execute("""
        SELECT DATE(clicked_at) as day, COUNT(*) as clicks
        FROM clicks
        WHERE alias = ? AND clicked_at >= ?
        GROUP BY day
        ORDER BY day
    """, (alias, seven_days_ago)).fetchall()
    conn.close()

    counts_by_day = {row["day"]: row["clicks"] for row in rows}
    today = datetime.utcnow().date()

    series = []
    for i in range(6, -1, -1):  # walk from 6 days ago up to today
        day = (today - timedelta(days=i)).isoformat()
        series.append({"date": day, "clicks": counts_by_day.get(day, 0)})

    return jsonify({"alias": alias, "series": series})