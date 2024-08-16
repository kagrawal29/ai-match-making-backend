//backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { extractStartupInfo } = require('./UrlProcessor.js');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

app.get('/', (req, res) => {
  res.send('Investor Matchmaking API is running');
});

app.post('/api/extract-info', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    const startupInfo = await extractStartupInfo(url);
    console.log('Sending response to frontend:', JSON.stringify(startupInfo, null, 2));
    res.json(startupInfo);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Failed to extract startup information', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});