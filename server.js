const express = require('express');
const app = express();
const { randomUUID } = require('crypto');
const fs = require('fs');

// In-memory store for redirect data and logs (replace with a database in production)
const redirectData = {};
const logs = {};

app.use(express.json());

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

function downloadLogs(uniqueId) {
  const linkLogs = logs[uniqueId] || [];

  const logString = linkLogs.map(log => 
    `Timestamp: ${log.timestamp}\n` +
    `IP Address: ${log.ipAddress}\n` +
    `Country: ${log.country}\n` +
    `City: ${log.city}\n` +
    `Region: ${log.region}\n` +
    '---\n'
  ).join('');

  const logFileName = `${uniqueId}.log`;
  fs.writeFileSync(logFileName, logString);
  return logFileName;
}

app.post('/save-link', (req, res) => {
  const { url } = req.body;

  if (!url) {
    return res.status(400).send('Missing target URL.');
  }

  const targetUrl = url.replace(/localhost:3000/g, ''); 
  const uniqueId = randomUUID();
  const redirectLink = `${req.protocol}://${req.get('host')}/${uniqueId}`;

  redirectData[uniqueId] = targetUrl;
  logs[uniqueId] = [];

  res.status(200).send({ id: uniqueId, redirectLink });
});

app.get('/:id', (req, res) => {
  const uniqueId = req.params.id;
  const targetUrl = redirectData[uniqueId];

  if (targetUrl) {
    fetch(`http://ip-api.com/json/`)
      .then(response => response.json())
      .then(data => {
        const { country, city, regionName, query } = data;
        const ipAddress = query;

        console.log(`IP: ${ipAddress}, Country: ${country}, City: ${city}, Region: ${regionName}`);

        logs[uniqueId].push({
          timestamp: new Date(),
          ipAddress,
          country,
          city,
          regionName,
        });
      })
      .catch(error => console.error('Error fetching geolocation:', error));

    console.log(`User accessed link with ID ${uniqueId}, redirecting to ${targetUrl}`);

    const redirectUrl = targetUrl.startsWith('http://') || targetUrl.startsWith('https://') 
      ? targetUrl 
      : `https://${targetUrl}`;

    res.redirect(redirectUrl);
  } else {
    res.status(404).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Error</title>
        <style>
          body {
            font-family: sans-serif;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            background: #f0f0f0;
            color: #333;
            transition: background-color 0.3s, color 0.3s;
          }

          body.dark-mode {
            background: #333;
            color: #f0f0f0;
          }

          .container {
            background: rgba(255, 255, 255, 0.25);
            border-radius: 16px;
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 40px;
            text-align: center;
            transition: background-color 0.3s;
          }

          body.dark-mode .container {
            background: rgba(51, 51, 51, 0.25);
          }

          h1 {
            color: #dc3545;
            margin-bottom: 20px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Error 404</h1>
          <p>Invalid redirect link.</p>
        </div>
      </body>
      </html>
    `);
  }
});

app.get('/download-logs/:id', (req, res) => {
  const uniqueId = req.params.id;
  const logFileName = downloadLogs(uniqueId);

  res.download(logFileName, (err) => {
    if (err) {
      console.error('Error downloading log file:', err);
      res.status(500).send('Error downloading logs.');
    } else {
      fs.unlinkSync(logFileName);
    }
  });
});

app.get('/logs/:id', (req, res) => {
  const uniqueId = req.params.id;
  const linkLogs = logs[uniqueId] || [];

  if (linkLogs) {
    const downloadLogsLink = `${req.protocol}://${req.get('host')}/download-logs/${uniqueId}`;

    res.send(` 
      <!DOCTYPE html>
      <html>
      <head>
        <title>Logs</title>
        <style>
          body {
            font-family: sans-serif;
            background: #f0f0f0;
            color: #333;
            transition: background-color 0.3s, color 0.3s;
          }

          body.dark-mode {
            background: #333;
            color: #f0f0f0;
          }

          .container {
            background: rgba(255, 255, 255, 0.25);
            border-radius: 16px;
            box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(5px);
            -webkit-backdrop-filter: blur(5px);
            border: 1px solid rgba(255, 255, 255, 0.3);
            padding: 40px;
            margin: 20px auto;
            max-width: 800px;
            transition: background-color 0.3s;
          }

          body.dark-mode .container {
            background: rgba(51, 51, 51, 0.25);
          }

          h1 {
            color: #333;
            margin-bottom: 20px;
            transition: color 0.3s;
          }

          body.dark-mode h1 {
            color: #f0f0f0;
          }

          ul {
            list-style: none;
            padding: 0;
          }

          li {
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2); /* Add a subtle border to list items */
            padding: 15px;
            margin-bottom: 10px;
            border-radius: 8px;
            transition: background-color 0.3s;
          }

          body.dark-mode li {
            background: rgba(51, 51, 51, 0.1);
            border-color: rgba(255, 255, 255, 0.1); /* Adjust border color in dark mode */
          }

          #downloadLogsButton {
            background-color: #28a745;
            color: white;
            padding: 12px 20px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            margin-top: 20px;
            transition: background-color 0.3s;
          }

          #downloadLogsButton:hover {
            background-color: #218838;
          }

          #darkModeButton {
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: transparent;
            border: none;
            cursor: pointer;
            font-size: 24px;
            color: #555;
            transition: color 0.3s;
          }

          #darkModeButton::before {
            content: '\\2600'; // Escape backslash here
          }

          body.dark-mode #darkModeButton::before {
            content: '\\263E'; // Escape backslash here
            color: #f0f0f0;
          }
        </style>
      </head>
      <body>
        <button id="darkModeButton" onclick="toggleDarkMode()"></button> 
        <div class="container">
          <h1>Logs for link ID: ${uniqueId}</h1>
          <ul>
            ${linkLogs.map(log => `
              <li>
                Timestamp: ${log.timestamp}<br>
                IP Address: ${log.ipAddress}<br>
                Country: ${log.country}<br>
                City: ${log.city}<br>
                Region: ${log.region}<br>
              </li>
            `).join('')}
          </ul>
          <button id="downloadLogsButton" onclick="window.location.href='${downloadLogsLink}'">Download Logs</button>
        </div>

        <script>
          function toggleDarkMode() {
            document.body.classList.toggle("dark-mode");
          }
        </script>
      </body>
      </html>
    `);
  } else {
    res.status(404).send('Logs not found.');
  }
});

app.listen(3000, () => {
  console.log('Server listening on port 3000');
});