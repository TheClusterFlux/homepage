const express = require('express');
const path = require('path');
const multer = require('multer');
const { fetchAndSaveHomepageData, addProjectWithImage, addCreator } = require('./dataManagement');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
// Serve static files (e.g., index.html, style.css, etc.)
app.use(express.static(path.join(__dirname)));


// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' }); // Temporary directory for uploaded files


// Serve static files from the "public" directory
app.use('/thumbnails', express.static(path.join(__dirname, '/data/thumbnails')));
app.use('/data', express.static(path.join(__dirname, 'data')));


// API endpoint to fetch and save data
app.get('/api/fetch-data', async (req, res) => {
  try {
    await fetchAndSaveHomepageData();
    res.status(200).send('Data fetched and saved locally');
  } catch (error) {
    console.error('Error in /api/fetch-data:', error);
    res.status(500).send('Failed to fetch data');
  }
});

// API endpoint to upload project data and image
app.post('/api/add-project', upload.single('image'), async (req, res) => {
    try {
        // Parse project data from the request body
        const projectData = JSON.parse(req.body.projectData); // Use the correct key for the JSON data
        console.log('Project Data:', projectData);

        const imagePath = req.file.path; // Path to the uploaded image
        console.log('Image Path:', imagePath);

        // Call the function to add the project and image to the database
        await addProjectWithImage(projectData, imagePath);

        // Delete the temporary uploaded file after processing
        // fs.unlinkSync(imagePath);

        res.status(200).send('Project and image added successfully');
    } catch (error) {
        console.error('Error in /api/add-project:', error);
        res.status(500).json({ error: error.message || 'An unexpected error occurred' });
    }
});

app.post('/api/add-creator', async (req, res) => {
    try {
        // Parse creator data from the request body
        const creatorData = req.body; // Use the correct key for the JSON data
        console.log('Creator Data:', creatorData);

        // Call the function to add the creator to the database
        await addCreator(creatorData);

        res.status(200).send('Creator added successfully');
    } catch (error) {
        console.error('Error in /api/add-creator:', error);
        res.status(500).json({ error: error.message || 'An unexpected error occurred' });
    }
});

// Fallback to serve index.html for any unknown routes (for SPA support)
app.get(/^\/(?!api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});