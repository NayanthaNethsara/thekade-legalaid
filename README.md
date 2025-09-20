# TheKade LegalAid

A hackathon project for a chatbot that answers legal questions using document context.

## Project Structure

```
TheKade-LegalAid/
├─ backend/            # FastAPI backend
│  ├─ .env             # Backend environment variables
├─ frontend/           # Next.js frontend
│  ├─ .env.local       # Frontend environment variables
├─ requirements.txt
└─ README.md
```

## Setup

### 1. Clone the repository

```bash
git clone
cd TheKade-LegalAid
```

### 2. Backend Setup

```bash
cd backend
python3 -m venv venv
source venv/bin/activate   # macOS/Linux
venv\Scripts\activate      # Windows
pip install -r requirements.txt
```

#### Environment Variables

Create a `.env` file in `backend/`:

```ini
GEMINI_API_KEY=your_key_here
DATABASE_URL=your_database_url_here
```

#### Run Backend

```bash
uvicorn main:app --reload
```

### 3. Frontend Setup

```bash
cd ../frontend
npm install
npm run dev
```

## Access

- **Backend:** [http://127.0.0.1:8000](http://127.0.0.1:8000)
- **Frontend:** [http://localhost:3000](http://localhost:3000)
