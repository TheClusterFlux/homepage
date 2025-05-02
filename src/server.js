const express = require('express');
const path = require('path');
const multer = require('multer');
const { fetchAndSaveHomepageData, addProjectWithImage, addCreator, addTechnology } = require('./dataManagement');
const fs = require('fs');
const { exec } = require('child_process');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());

// IMPORTANT: Order of middleware matters!
// Serve specific static files and directories first (must come before any routes)
app.use(express.static(path.join(__dirname)));
app.use('/thumbnails', express.static(path.join(__dirname, '/data/thumbnails')));
app.use('/data', express.static(path.join(__dirname, 'data')));

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' }); // Temporary directory for uploaded files

// Proxy for Prometheus - this middleware must come after static file middleware
app.use('/prometheus', (req, res) => {
  console.log(`Proxying Prometheus request: ${req.url}`);
  
  // Determine the Prometheus host based on environment
  const prometheusHost = process.env.KUBERNETES_SERVICE_HOST ? 
    'monitoring-stack-kube-prom-prometheus.monitoring.svc.cluster.local' : 
    'localhost';
  
  // Determine the Prometheus port based on environment
  const prometheusPort = process.env.KUBERNETES_SERVICE_HOST ? 9090 : 9090;
  
  // Build the target URL from the original URL
  const targetPath = req.url;
  
  // Set up the options for the HTTP request to Prometheus
  const options = {
    hostname: prometheusHost,
    port: prometheusPort,
    path: targetPath,
    method: req.method,
    headers: {
      'Content-Type': 'application/json',
    },
  };
  
  // Create the proxy request
  const proxyReq = http.request(options, (proxyRes) => {
    // Set headers from the Prometheus response
    Object.keys(proxyRes.headers).forEach(key => {
      res.setHeader(key, proxyRes.headers[key]);
    });
    
    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    
    // Set the status code
    res.statusCode = proxyRes.statusCode;
    
    // Pipe the Prometheus response directly to our response
    proxyRes.pipe(res);
  });
  
  // Handle errors in the proxy request
  proxyReq.on('error', (error) => {
    console.error(`Error proxying to Prometheus: ${error.message}`);
    res.status(500).json({
      error: 'Failed to proxy request to Prometheus',
      message: error.message,
    });
  });
  
  // If this is a POST request, pipe the request body to the proxy request
  if (req.method === 'POST') {
    req.pipe(proxyReq);
  } else {
    // End the request for GET requests
    proxyReq.end();
  }
});

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

// API endpoint to get cluster metrics
app.get('/api/cluster-metrics', async (req, res) => {
  try {
    // Check if running in Kubernetes or local development
    const isKubernetes = process.env.KUBERNETES_SERVICE_HOST ? true : false;
    
    if (isKubernetes) {
      // Production: Use kubectl commands to get metrics
      const getNodes = () => {
        return new Promise((resolve, reject) => {
          exec('kubectl get nodes', (error, stdout, stderr) => {
            if (error) {
              console.error(`Error executing kubectl get nodes: ${error.message}`);
              return reject(error);
            }
            if (stderr) {
              console.error(`kubectl get nodes stderr: ${stderr}`);
            }
            // Count lines in output (minus header)
            const lines = stdout.trim().split('\n');
            resolve(lines.length > 0 ? lines.length - 1 : 0);
          });
        });
      };
      
      const getPods = () => {
        return new Promise((resolve, reject) => {
          exec('kubectl get pods --all-namespaces', (error, stdout, stderr) => {
            if (error) {
              console.error(`Error executing kubectl get pods: ${error.message}`);
              return reject(error);
            }
            if (stderr) {
              console.error(`kubectl get pods stderr: ${stderr}`);
            }
            const lines = stdout.trim().split('\n');
            resolve(lines.length > 0 ? lines.length - 1 : 0);
          });
        });
      };
      
      const getCpuMemory = () => {
        return new Promise((resolve, reject) => {
          exec('kubectl top nodes', (error, stdout, stderr) => {
            if (error) {
              console.error(`Error executing kubectl top nodes: ${error.message}`);
              return reject(error);
            }
            if (stderr && !stderr.includes('Metrics API')) {
              console.error(`kubectl top nodes stderr: ${stderr}`);
            }
            
            let totalCpuUsage = 0;
            let totalCpuCapacity = 0;
            let totalMemUsage = 0;
            let totalMemCapacity = 0;
            
            const lines = stdout.trim().split('\n').slice(1); // Skip header
            
            lines.forEach(line => {
              const parts = line.trim().split(/\s+/);
              // Format: NAME CPU(cores) CPU% MEMORY(bytes) MEMORY%
              if (parts.length >= 5) {
                // Extract CPU usage and convert to cores
                const cpuUsage = parseFloat(parts[1].replace('m', '')) / 1000;
                totalCpuUsage += cpuUsage;
                
                // Estimate total CPU from percentage
                const cpuPercent = parseFloat(parts[2].replace('%', '')) / 100;
                const nodeCpuTotal = cpuUsage / cpuPercent;
                totalCpuCapacity += nodeCpuTotal;
                
                // Extract memory usage and convert to GB
                const memStr = parts[3];
                let memUsage;
                if (memStr.endsWith('Mi')) {
                  memUsage = parseFloat(memStr.replace('Mi', '')) / 1024;
                } else if (memStr.endsWith('Gi')) {
                  memUsage = parseFloat(memStr.replace('Gi', ''));
                } else if (memStr.endsWith('Ki')) {
                  memUsage = parseFloat(memStr.replace('Ki', '')) / (1024 * 1024);
                } else {
                  memUsage = parseFloat(memStr) / (1024 * 1024 * 1024);
                }
                totalMemUsage += memUsage;
                
                // Estimate total memory from percentage
                const memPercent = parseFloat(parts[4].replace('%', '')) / 100;
                const nodeMemTotal = memUsage / memPercent;
                totalMemCapacity += nodeMemTotal;
              }
            });
            
            resolve({
              cpu: {
                usage: parseFloat(totalCpuUsage.toFixed(2)),
                total: parseFloat(totalCpuCapacity.toFixed(2))
              },
              memory: {
                usage: parseFloat(totalMemUsage.toFixed(2)),
                total: parseFloat(totalMemCapacity.toFixed(2))
              }
            });
          });
        });
      };
      
      try {
        const [nodeCount, podCount, resourceUsage] = await Promise.all([
          getNodes(),
          getPods(),
          getCpuMemory()
        ]);
        
        const metrics = {
          nodes: {
            count: nodeCount
          },
          pods: {
            count: podCount
          },
          cpu: resourceUsage.cpu,
          memory: resourceUsage.memory
        };
        
        res.json(metrics);
      } catch (error) {
        console.error('Error fetching Kubernetes metrics:', error);
        res.status(500).json({
          error: 'Failed to fetch Kubernetes metrics',
          message: error.message
        });
      }
    } else {
      // Development: Return mock data
      const mockMetrics = {
        nodes: {
          count: 3
        },
        pods: {
          count: 24
        },
        cpu: {
          usage: 4.2,
          total: 12
        },
        memory: {
          usage: 9.7,
          total: 32
        }
      };
      
      res.json(mockMetrics);
    }
  } catch (error) {
    console.error('Error in /api/cluster-metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch cluster metrics',
      message: error.message
    });
  }
});

// API endpoint to upload project data and image
app.post('/api/add-project', upload.single('image'), async (req, res) => {
    try {
        // Parse project data from the request body
        const projectData = JSON.parse(req.body.projectData); // Ensure the key matches the form field name
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

app.post('/api/add-technology', async (req, res) => {
    try {
        // Parse technology data from the request body
        const technologyData = req.body;
        console.log('Technology Data:', technologyData);

        // Call the function to add the technology to the database
        await addTechnology(technologyData);

        res.status(200).send('Technology added successfully');
    } catch (error) {
        console.error('Error in /api/add-technology:', error);
        res.status(500).json({ error: error.message || 'An unexpected error occurred' });
    }
});

// Specific routes for HTML pages - these should come after API routes but before the fallback
app.get('/about.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'about.html'));
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Fallback route - must be last
app.get(/^\/(?!api)(?!about\.html)(?!prometheus)(?!data)(?!thumbnails).*/, (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});