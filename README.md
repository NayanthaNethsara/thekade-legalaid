# LegalAid AI Services

**Status:** Under Construction

LegalAid AI Services is a project aimed at providing AI-powered legal assistance. Detailed project description will be added soon.

## Repository Structure

```
.
├── backend/   # FastAPI backend with JWT auth and PostgreSQL/MongoDB
├── frontend/  # Next.js frontend using App Router and TypeScript
└── README.md  # This file
```

## Setup Guides

- **Backend Setup:** See [`backend/README.md`](backend/README.md)  
   Includes instructions for virtual environment, dependencies, database, environment variables, and running the API.

- **Frontend Setup:** See [`frontend/README.md`](frontend/README.md)  
   Includes instructions for Node.js setup, dependencies, environment variables, and running the development server.

## Notes

- Use the backend API URL in the frontend `.env.local` file.
- Make sure to follow each folder’s README for proper environment setup.
- Database migrations for the backend should be done using Alembic (see backend guide).
