"""Application entry point: sets up Flask app, CORS, DB, and routes."""

from flask import Flask
from flask_cors import CORS

from database.database import init_db
from routes.urls import api as urls_api
from routes.analytics import api as analytics_api

app = Flask(__name__)
CORS(app)  # allow requests from the frontend's dev server (different origin/port)
init_db()

app.register_blueprint(urls_api)
app.register_blueprint(analytics_api)

if __name__ == "__main__":
    app.run(debug=True, port=5001)  