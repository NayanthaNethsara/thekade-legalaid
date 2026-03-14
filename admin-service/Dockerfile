FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create data directory for document uploads
RUN mkdir -p /app/data

EXPOSE 8001

CMD ["python", "-m", "app.main"]
