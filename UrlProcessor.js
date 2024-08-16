//backend/UrlProcessor.js
const { getStartupInfo } = require('./PerplexityApi.js');

async function extractStartupInfo(url) {
    try {
        const startupInfo = await getStartupInfo(url);
        console.log(startupInfo);
        return {
          startupInfo,
          url
        };
      } catch (error) {
        console.error('Error extracting startup info:', error);
        throw error;
      }
}

module.exports = { extractStartupInfo };