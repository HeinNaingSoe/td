# Vercel Deployment Guide

This guide explains how to deploy the application to Vercel with MongoDB backend support.

## Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. MongoDB Atlas account with connection string
3. GitHub repository (recommended for automatic deployments)

## Deployment Steps

### 1. Push Code to GitHub

Make sure your code is pushed to a GitHub repository.

### 2. Import Project to Vercel

1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Vercel will auto-detect the project settings

### 3. Configure Environment Variables

In your Vercel project settings, go to **Settings → Environment Variables** and add:

```
MONGODB_URI=mongodb+srv://your_username:your_password@cluster.mongodb.net/
DB_NAME=td
COLLECTION_NAME=td1
```

**Important:** Replace the connection string with your actual MongoDB connection string.

### 4. Configure Build Settings

Vercel should auto-detect the build settings, but verify:

- **Build Command:** `npm run build`
- **Output Directory:** `dist`
- **Install Command:** `npm install`

### 5. Deploy

Click **Deploy** and wait for the build to complete.

## How It Works

- **Frontend:** Built with Vite and served as static files
- **Backend:** Express server runs as Vercel serverless functions in `/api`
- **Database:** MongoDB connection uses connection pooling for serverless efficiency

## API Routes

All API routes are available at:
- Production: `https://your-app.vercel.app/api/*`
- Development: `http://localhost:3001/api/*`

The frontend automatically uses the correct API URL based on the environment.

## Troubleshooting

### "No users found" Error

1. Check that environment variables are set correctly in Vercel
2. Verify MongoDB connection string is correct
3. Check Vercel function logs for errors
4. Ensure MongoDB Atlas allows connections from anywhere (0.0.0.0/0) or add Vercel IPs

### Build Errors

1. Check that all dependencies are in `package.json`
2. Verify TypeScript compilation passes: `npm run build`
3. Check Vercel build logs for specific errors

### API Not Working

1. Check Vercel function logs
2. Test the `/api/health` endpoint
3. Verify MongoDB connection string format

## Local Development

For local development, use:

```bash
npm run dev:all
```

This starts both the frontend (port 5173) and backend (port 3001) servers.
