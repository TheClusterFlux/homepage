const { MongoClient, GridFSBucket } = require('mongodb');
const fs = require('fs');
const path = require('path');

const { pipeline } = require('stream/promises');
const { randomUUID } = require('crypto');
const { connectionURI, databaseName } = require('./mongo');

async function fetchAndSaveHomepageData() {
    const client = new MongoClient(connectionURI); // Create a new client instance
    try {
        await client.connect();
        console.log('Connected to MongoDB');

        const db = client.db(databaseName);
        const creatorsCollection = db.collection('creators');
        const projectsCollection = db.collection('projects');
        const technologiesCollection = db.collection('technologies');

        // Fetch data from MongoDB
        const creators = await creatorsCollection.find({}).toArray();
        const projects = await projectsCollection.find({}).toArray();
        const technologies = await technologiesCollection.find({}).toArray();

        // Save data locally
        const dataDir = path.join(__dirname, 'data');
        if (!fs.existsSync(dataDir)) {
            fs.mkdirSync(dataDir);
        }

        fs.writeFileSync(path.join(dataDir, 'creators.json'), JSON.stringify(creators, null, 2));
        fs.writeFileSync(path.join(dataDir, 'projects.json'), JSON.stringify(projects, null, 2));
        fs.writeFileSync(path.join(dataDir, 'technologies.json'), JSON.stringify(technologies, null, 2));

        console.log('Data fetched and saved locally');

        // Fetch thumbnails from GridFS
        const bucket = new GridFSBucket(db, { bucketName: 'thumbnails' });
        const thumbnailsDir = path.join(dataDir, 'thumbnails');
        if (!fs.existsSync(thumbnailsDir)) {
            fs.mkdirSync(thumbnailsDir);
        }

        // Process duplicate filenames in upload order so the newest version is served.
        for await (const file of bucket.find({}).sort({ uploadDate: 1, _id: 1 })) {
            const filename = path.basename(file.filename).replace(/\s+/g, '_');
            const destination = path.join(thumbnailsDir, filename);
            const tempPath = destination + '.' + randomUUID();
            try {
                await pipeline(bucket.openDownloadStream(file._id), fs.createWriteStream(tempPath));
                fs.renameSync(tempPath, destination);
            } finally {
                await fs.promises.rm(tempPath, { force: true });
            }
        }
    } finally {
        await client.close();
    }
}

async function addProjectWithImage(projectData, imagePath) {
    const client = new MongoClient(connectionURI); // Create a new client instance
    try {
        
        //expect a password to be passed in the projectData object
        if (!projectData.password) {
            throw new Error('Password is required to add a project.');
        }
        // Check if the password is correct
        const password = process.env.PASSWORD; // Use a default password if not set
        if (projectData.password !== password) {
            throw new Error('Incorrect password. Project not added.');
        }
        //remove password from projectData if it exists
        if (projectData.password) {
            delete projectData.password;
        }
        await client.connect();
        console.log('Connected to MongoDB');
    
        const db = client.db(databaseName);
        const projectsCollection = db.collection('projects');
        const bucket = new GridFSBucket(db, { bucketName: 'thumbnails' });
        
        // Validate projectData structure
        const validCategories = ['games', 'tools', 'infrastructure'];
        if (!projectData.title || !projectData.description || !projectData.links || !projectData.tech || !projectData.fileType) {
            throw new Error('Invalid project data structure. Ensure it matches projects.json.');
        }
        if (!projectData.category || !validCategories.includes(projectData.category)) {
            throw new Error('Invalid or missing category. Must be one of: games, tools, infrastructure.');
        }
        
        //replace spaces with underscores in the title
        const filename = projectData.title.replace(/\s+/g, '_');
        // Extract file extension from imagePath
        const filenameWithExtension = `${filename}.${projectData.fileType}`; // Use project title with file extension as the file name
    
        // Upload the image to GridFS
        const imageStream = fs.createReadStream(imagePath);
        const uploadStream = bucket.openUploadStream(filenameWithExtension); // Use project title with file extension as the file name
        imageStream.pipe(uploadStream);
    
        await new Promise((resolve, reject) => {
            uploadStream.on('finish', () => {
                projectData.image = uploadStream.filename; // Store the uploaded image filename
                resolve();
            });
            uploadStream.on('error', reject);
        });
    
        console.log(`Image uploaded to GridFS with filename: ${projectData.image}`);
    
        // Add the project data to the database
        await projectsCollection.insertOne(projectData);
        console.log('Project data added to the database:', projectData);
    } catch (error) {
        console.error('Error adding project with image:', error);
        throw error; // Rethrow the error to be handled by the caller
    } finally {
        await client.close();
    }
}

async function addCreator(creatorData) {
    const client = new MongoClient(connectionURI); // Create a new client instance
    try {
        if (!creatorData) {
            throw new Error('Creator data is required to add a creator.');
        }
        if (!creatorData.password) {
            throw new Error('Password is required to add a creator.');
        }
        // Check if the password is correct
        const password = process.env.PASSWORD; // Use a default password if not set
        if (creatorData.password !== password) {
            throw new Error('Incorrect password. Creator not added.');
        }
        //remove password from creatorData if it exists
        if (creatorData.password) {
            delete creatorData.password;
        }
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db(databaseName);
        const creatorsCollection = db.collection('creators');
        
        // Validate creatorData structure
        if (!creatorData.name ||  !creatorData.github) {
            throw new Error('Invalid creator data structure. Ensure it matches creators.json.');
        }
        
        // Add the creator data to the database
        await creatorsCollection.insertOne(creatorData);
        console.log('Creator data added to the database:', creatorData);
    } catch (error) {
        console.error('Error adding creator:', error);
        throw error; // Rethrow the error to be handled by the caller
    } finally {
        await client.close();
    }
}

async function addTechnology(technologyData) {
    const client = new MongoClient(connectionURI);
    try {
        if (!technologyData) {
            throw new Error('Technology data is required to add a technology.');
        }
        if (!technologyData.password) {
            throw new Error('Password is required to add a technology.');
        }
        
        // Check if the password is correct
        const password = process.env.PASSWORD;
        if (technologyData.password !== password) {
            throw new Error('Incorrect password. Technology not added.');
        }
        
        // Remove password from technologyData
        delete technologyData.password;
        
        await client.connect();
        console.log('Connected to MongoDB');
        
        const db = client.db(databaseName);
        const technologiesCollection = db.collection('technologies');
        
        // Validate technologyData structure
        if (!technologyData.name || !technologyData.description) {
            throw new Error('Invalid technology data structure. Required fields: name and description.');
        }
        
        // Add the technology data to the database
        await technologiesCollection.insertOne(technologyData);
        console.log('Technology data added to the database:', technologyData);
    } catch (error) {
        console.error('Error adding technology:', error);
        throw error;
    } finally {
        await client.close();
    }
}

module.exports = { fetchAndSaveHomepageData, addProjectWithImage, addCreator, addTechnology };