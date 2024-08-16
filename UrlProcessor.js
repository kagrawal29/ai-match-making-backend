const { getGeneralStartupInfo } = require('./PerplexityApi.js');
const axios = require('axios');

async function fetchWebsiteContent(url) {
    try {
        const response = await axios.get(`https://r.jina.ai/${url}`);
        console.log(`Fetched content for ${url}:`, response.data.substring(0, 500) + '...');
        return response.data;
    } catch (error) {
        console.error(`Error fetching content for ${url}:`, error);
        return null;
    }
}

async function extractStartupInfo(url) {
    try {
        // Get general info from Perplexity
        const generalInfo = await getGeneralStartupInfo(url);
        console.log('General Info from Perplexity:', generalInfo);

        // Fetch startup's website content
        const websiteContent = await fetchWebsiteContent(url);
        console.log('Website Content:', websiteContent);

        return {
            generalInfo,
            websiteContent,
            originalUrl: url
        };
    } catch (error) {
        console.error('Error extracting startup info:', error);
        throw error;
    }
}

module.exports = { extractStartupInfo };