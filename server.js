const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { extractStartupInfo } = require('./UrlProcessor.js');
const { extractStructuredData } = require('./GPT4Processor.js');
const { connectToMongo, matchInvestors } = require('./investorMatcher');

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Connect to MongoDB when the server starts
connectToMongo().catch(console.error);

app.get('/', (req, res) => {
  res.send('Investor Matchmaking API is running');
});

app.post('/extract-info', async (req, res) => {
  try {
    const { url } = req.body;
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }
    const rawInfo = await extractStartupInfo(url);
    const structuredData = await extractStructuredData(
      rawInfo.generalInfo,
      rawInfo.websiteContent
    );
    console.log('Structured Data:', JSON.stringify(structuredData, null, 2));
    res.json(structuredData);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ 
      error: 'Failed to extract startup information', 
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

app.post('/match-investors', async (req, res) => {
  try {
    const startupData = req.body;
    const matchedInvestors = await matchInvestors(startupData);
    res.json(matchedInvestors);
  } catch (error) {
    console.error('Error matching investors:', error);
    res.status(500).json({ error: 'An error occurred while matching investors' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});