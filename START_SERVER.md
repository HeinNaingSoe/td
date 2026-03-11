# How to Start the Application

## Important: You need to start the backend server first!

The error you're seeing happens because the backend server isn't running. Follow these steps:

### Step 1: Install Dependencies (if not already done)
```bash
npm install
```

### Step 2: Start the Backend Server
Open a terminal and run:
```bash
npm run server
```

You should see:
```
✅ Connected to MongoDB
🚀 Server running on http://localhost:3001
```

### Step 3: Start the Frontend (in a new terminal)
Open another terminal and run:
```bash
npm run dev
```

### Alternative: Start Both at Once
If you have `concurrently` installed, you can run:
```bash
npm run dev:all
```

This will start both the backend (port 3001) and frontend (port 5173) servers.

## Troubleshooting

If you still see the error:
1. Make sure the backend server is running on port 3001
2. Check that MongoDB connection is working
3. Verify the API URL in your browser's network tab
4. Check the browser console for more detailed error messages
