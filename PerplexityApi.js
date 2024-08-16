const { OpenAI } = require('openai');
require('dotenv').config();

const modelName = "llama-3.1-sonar-small-128k-online";
const client = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: "https://api.perplexity.ai"
});

const sysMsg = `You are a world class researcher at Qubit Capital, a digital investment bank which helps startups connect and raise capital from potential investors. Provide accurate information about the given startup. If you can't find specific information, clearly state that. Always include the source URL for funding information if available.`;

async function perplexityAPICall(userMsg) {
  try {
    const response = await client.chat.completions.create({
      model: modelName,
      messages: [
        { role: "system", content: sysMsg },
        { role: "user", content: userMsg }
      ],
      temperature: 0,
    });
    return { response, error: false };
  } catch (error) {
    return { response: error.toString(), error: true };
  }
}

async function getGeneralStartupInfo(website) {
  const infoMsg = `Provide general information about the startup ${website}. Include details about the company, its location, and any funding information you can find. If you find funding information, please provide the source URL. Do not make up any information. If you can't find certain details, clearly state that the information is not available. Focus on getting the funding details and the company location.`;
  
  try {
    const { response, error } = await perplexityAPICall(infoMsg);
    if (error) {
      throw new Error('Failed to get startup information from Perplexity');
    }
    const content = response.choices[0].message.content;
    console.log('Perplexity API Response:', content);
    return content;
  } catch (error) {
    console.error('Error getting startup info from Perplexity:', error);
    throw error;
  }
}

module.exports = { getGeneralStartupInfo };