FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create data directories for source PDFs and parsed Markdown
RUN mkdir -p /app/data/markdown

EXPOSE 8001

# Apply DB migrations, then serve the API. `exec` makes uvicorn PID 1 so it
# receives SIGTERM directly and shuts down promptly on `docker stop`.
CMD ["sh", "-c", "alembic upgrade head && exec uvicorn app.main:app --host 0.0.0.0 --port 8001"]
