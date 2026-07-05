FROM python:3.12-slim

WORKDIR /app

# Install dependencies first so Docker can cache this layer
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt gunicorn

# Copy the rest of the backend source
COPY . .

# SQLite file will be created here at runtime if it doesn't exist
EXPOSE 5001

# Use gunicorn instead of the Flask dev server for a more production-like setup
CMD ["gunicorn", "-b", "0.0.0.0:5001", "--workers", "2", "--threads", "4", "--timeout", "120", "app:app"]