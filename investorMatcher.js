const OpenAI = require("openai");
const { z } = require("zod");
const { zodResponseFormat } = require("openai/helpers/zod");
const { MongoClient } = require('mongodb');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// MongoDB setup
const mongoUri = 'mongodb://localhost:27017/';
const dbName = 'InvestorData';
let investmentsCollection;

async function connectToMongo() {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db(dbName);
    investmentsCollection = db.collection('Investments');
}

async function getUniqueValues(field) {
    return await investmentsCollection.distinct(field);
}

const MappingSchema = z.object({
    mapped_verticlas: z.array(z.string()),
    mapped_stage: z.array(z.string()),
    mapped_country: z.string(),
});

async function mapStartupData(startupData) {
    const investmentSectors = await getUniqueValues('investment_sector');
    const investmentStages = await getUniqueValues('investment_stage');
    const investmentCountries = await getUniqueValues('investment_country');

    const prompt = `
    Map the following startup data to the closest matching investment database fields:
    
    Startup Data:
    - Startup Intro: ${startupData.startupIntro}
    - Verticals: ${startupData.verticals.join(', ')}
    - Funding Stage: ${startupData.fundingStage}
    - Location: ${startupData.startupLocation}
    - Fund Ask: ${startupData.fundAsk}
    
    Investment Database Fields:
    - Investment Stages: ${investmentStages.join(', ')}
    - Investment Country: ${investmentCountries.join(', ')}
    
    Provide the mapping for these two fields only. Choose the closest and the relevant matches for the investment stages based on the funding stage and fund ask. Fund ask is in $millions.
    If, fundask is more than 1, then both 'Seed' and 'Series A' would be good matches for mapped_stage. If fund ask is less than 1, map only 'Seed' to mapped_stage. For higher asks and basis funding stage, other options could be good matches.
    Choose only single best match for the country.
    `;

    try {
        const completion = await openai.beta.chat.completions.parse({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful assistant that maps startup data to investment database fields." },
                { role: "user", content: prompt }
            ],
            response_format: zodResponseFormat(MappingSchema, "startup_data_mapping"),
        });

        const mappedData = completion.choices[0].message.parsed;
        console.log('Mapped Data:', JSON.stringify(mappedData, null, 2));
        return mappedData;
    } catch (error) {
        console.error('Error mapping startup data:', error);
        throw error;
    }
}

module.exports = {
    connectToMongo,
    mapStartupData
};