# Troubleshooting Guide

## Error: "Unexpected token '<', "<!DOCTYPE "... is not valid JSON"

This error occurs when the API endpoint returns HTML instead of JSON. Here's how to fix it:

### Solution 1: Restart the Backend Server

After adding new routes, you must restart the Express server:

1. Stop the server (Ctrl+C)
2. Start it again: `npm start` or `npm run dev`

### Solution 2: Verify Server is Running

1. Check if the backend server is running on port 5000
2. Test the API endpoint: Open `http://localhost:5000/api/ai/test` in your browser
3. You should see: `{"message":"AI routes are working!","apiKeyConfigured":true}`

### Solution 3: Check Route Order

The API routes must be registered BEFORE the static file serving middleware. Verify in `server.js`:

```javascript
// API Routes - MUST be before static file serving
app.use('/api/syllabus', syllabusRoutes);
app.use('/api/matrices', matrixRoutes);
app.use('/api/ai', aiRoutes);

// Static files should come AFTER API routes
```

### Solution 4: Verify Proxy Configuration

In `client/package.json`, ensure the proxy is set:

```json
"proxy": "http://localhost:5000"
```

### Solution 5: Check Console Logs

1. Check the backend server console for errors
2. Check the browser console (F12) for detailed error messages
3. Look for CORS errors or connection refused errors

### Solution 6: Test API Directly

Test the API endpoint directly using curl or Postman:

```bash
curl -X POST http://localhost:5000/api/ai/generate-ilos \
  -H "Content-Type: application/json" \
  -d '{"units":[{"text":"test"}],"pos":[{"poNo":1}],"psos":[{"psoNo":1}]}'
```

### Common Issues

1. **Server not running**: Start with `npm start` in the root directory
2. **Port conflict**: Ensure port 5000 is not used by another application
3. **Missing dependencies**: Run `npm install` in both root and client directories
4. **Environment variables**: Ensure `.env` file exists with `MISTRALAI_API_KEY`

### Development Setup

1. **Terminal 1** (Backend):
   ```bash
   npm start
   # or
   npm run dev
   ```

2. **Terminal 2** (Frontend):
   ```bash
   npm run client
   ```

3. Open browser to `http://localhost:3000`
