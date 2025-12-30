# TheClusterFlux Homepage

TheClusterFlux Homepage is the front-facing web application for TheClusterFlux project. It serves as the main entry point for users, providing information, navigation, and access to the project's features.

## Features

- User-friendly interface for navigating TheClusterFlux projects.
- Integration with backend services for dynamic content.
- Dark mode support with theme toggle.
- Featured projects section.
- Responsive design with Guilty Crown-inspired styling.

## API Endpoints

### Refresh Data from MongoDB

**Endpoint:** `GET /api/fetch-data`

This endpoint fetches the latest data from MongoDB and updates the local JSON files (`projects.json`, `creators.json`, `technologies.json`) and thumbnails. This is useful when you've made changes to the database and want to update the homepage without restarting the server.

**Response:**
```json
{
  "success": true,
  "message": "Data fetched and saved locally",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Error Response:**
```json
{
  "success": false,
  "message": "Failed to fetch data",
  "error": "Error message here",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

**Usage Examples:**

1. **Using curl:**
   ```bash
   curl https://homepage.theclusterflux.com/api/fetch-data
   ```

2. **Using curl (local development):**
   ```bash
   curl http://localhost:8080/api/fetch-data
   ```

3. **Using wget:**
   ```bash
   wget -O- https://homepage.theclusterflux.com/api/fetch-data
   ```

4. **Using PowerShell (Windows):**
   ```powershell
   Invoke-WebRequest -Uri "https://homepage.theclusterflux.com/api/fetch-data" -Method GET
   ```

5. **Using a browser:**
   Simply navigate to: `https://homepage.theclusterflux.com/api/fetch-data`

**Note:** The server automatically fetches data on startup, so this endpoint is primarily useful for refreshing data after making changes to the MongoDB database without restarting the server.

## Possible Expansion Features

- **Edit Project**: Allow users to edit project details directly from the homepage.
- **Dashboard**: Provide a dashboard view with project statistics and analytics.
