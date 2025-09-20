# Frontend - LegalAid

This folder contains the Next.js frontend for the LegalAid project using App Router and TypeScript.

## Folder Structure

```
frontend/
├── app/                 # Next.js App Router pages
│   ├── layout.tsx       # Root layout
│   ├── page.tsx         # Homepage
│   └── api/             # API routes
├── components/          # React components
├── public/              # Static files (images, favicon, etc.)
├── styles/              # Global CSS
├── package.json         # Project dependencies & scripts
├── tsconfig.json        # TypeScript configuration
└── next.config.js       # Next.js config
```

## Setup Guide

### 1. Install Node.js

Make sure you have Node.js v18+ installed.

```bash
node -v
npm -v
```

### 2. Install Dependencies

From the `frontend` folder:

```bash
npm install
```

### 3. Environment Variables

Create a `.env.local` file in `frontend/` if needed for API URLs:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

> **Note:** `NEXT_PUBLIC_` prefix is required to expose variables to the frontend.

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Build & Production

```bash
# Build project
npm run build

# Start production server
npm start
```

### 6. Linting

```bash
npm run lint
```

## Notes

- All API calls should use `NEXT_PUBLIC_API_URL` from `.env.local`.
- Components are in `components/` and pages in `app/`.
- App uses **App Router**, not Pages Router.
- You can extend the `app/api/` folder for frontend API routes (e.g., proxy calls to backend).
