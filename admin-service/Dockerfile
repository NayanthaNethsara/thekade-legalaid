FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create data directories for source PDFs and parsed Markdown
RUN mkdir -p /app/data/markdown

EXPOSE 8001

# Apply DB migrations, then serve the API.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8001"]
