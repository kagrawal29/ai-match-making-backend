//backend/PerplexityApi.js
const { OpenAI } = require('openai');
require('dotenv').config();

const modelName = "llama-3.1-sonar-small-128k-online";
const client = new OpenAI({
  apiKey: process.env.PERPLEXITY_API_KEY,
  baseURL: "https://api.perplexity.ai"
});

const sysMsg = `You are a world class researcher at Qubit Capital, a digital investment bank which helps startups (its clients) connect and raise capital from potential investors including VCs, PEs, Family Offices and Strategic corporates. You have to research for the most relevant and up to date information based on the user's search queries. Always respond with clean JSON without any markdown formatting.`;

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

async function perplexityResponse(userMsg) {
  const { response, error } = await perplexityAPICall(userMsg);
  if (error) {
    console.error(`Error in API call: ${response}`);
    return null;
  } else {
    return response.choices[0].message.content;
  }
}

function cleanJsonResponse(response) {
  // Remove any markdown formatting
  let cleaned = response.replace(/```json\s?|```/g, '');
  
  // Trim any leading or trailing whitespace
  cleaned = cleaned.trim();
  
  // If the response doesn't start with '{', assume it's not JSON and return null
  if (!cleaned.startsWith('{')) {
    console.error('Response is not in expected JSON format:', cleaned);
    return null;
  }
  
  return cleaned;
}

async function getStartupInfo(website) {
  const overviewMsg = `Provide a JSON object with "companyName"(name of the company), "companyIndustry"(which industry company belongs to), "companyGeography"(which country company is based out of), "companyLinkedinURL"(Linkedin URL of the company) and "companyTeamSize"(Team size of the company) as the keys for the startup: ${website}. Respond with clean JSON only, no markdown.`;
  
  try {
    const overview = await perplexityResponse(overviewMsg);
    if (!overview) {
      throw new Error('Failed to get startup information');
    }
    
    const cleanedJson = cleanJsonResponse(overview);
    if (!cleanedJson) {
      throw new Error('Failed to parse startup information');
    }
    
    return JSON.parse(cleanedJson);
  } catch (error) {
    console.error('Error getting startup info:', error);
    throw error;
  }
}

module.exports = { getStartupInfo };