# Conversation Service (Python Worker)

This service handles conversation logic and interacts with the database.

## Prerequisites

- Python 3.9+
- PostgreSQL
- pip

## Setup

1. **Create Virtual Environment:**

   ```bash
   python3 -m venv .venv
   source .venv/bin/activate
   ```

2. **Install Dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Environment Setup:**
   Copy `.env.example` to `.env` and update the `DATABASE_URL`.
   ```bash
   cp .env.example .env
   ```

## Database Migrations

This project uses Alembic for database migrations.

1. **Generate Migration:**

   ```bash
   alembic revision --autogenerate -m "Message"
   ```

2. **Apply Migrations:**
   ```bash
   alembic upgrade head
   ```

## Project Structure

- `app/`: Application code
  - `core/`: Configuration and database setup
  - `models/`: Database models
- `alembic/`: Migration scripts
