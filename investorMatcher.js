const OpenAI = require("openai");
const { z } = require("zod");
const { zodResponseFormat } = require("openai/helpers/zod");
const { MongoClient, ObjectId } = require('mongodb');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// MongoDB setup
const mongoUri = 'mongodb://localhost:27017/';
const dbName = 'InvestorData';
let investmentsCollection, investorsCollection;

async function connectToMongo() {
    const client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db(dbName);
    investmentsCollection = db.collection('Investments');
    investorsCollection = db.collection('Investors');
}

async function getUniqueValues(field) {
    return await investmentsCollection.distinct(field);
}

const MappingSchema = z.object({
    mapped_verticals: z.array(z.string()),
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
    - Investment Sectors: ${investmentSectors.join(', ')}
    - Investment Stages: ${investmentStages.join(', ')}
    - Investment Country: ${investmentCountries.join(', ')}
    
    Provide the mapping for these fields. Choose the closest and the relevant matches for the investment sectors and stages. For the country, choose only the single best match.
    If fund ask is more than 1, then both 'Seed' and 'Series A' would be good matches for mapped_stage. If fund ask is less than 1, map only 'Seed' to mapped_stage. For higher asks and based on funding stage, other options could be good matches.
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

async function fetchInvestors(mappedData) {
    if (!mappedData || typeof mappedData !== 'object') {
        throw new Error('Invalid mapped data');
    }

    const { mapped_verticals, mapped_stage, mapped_country } = mappedData;

    if (!Array.isArray(mapped_verticals) || !Array.isArray(mapped_stage) || typeof mapped_country !== 'string') {
        throw new Error('Mapped data has incorrect structure');
    }

    const combinations = mapped_verticals.flatMap(vertical => 
        mapped_stage.map(stage => ({ vertical, stage, country: mapped_country }))
    );

    let investorData = {};

    for (const combo of combinations) {
        console.log(`Searching for: ${JSON.stringify(combo)}`);
        const matchingInvestments = await investmentsCollection.find({
            investment_sector: combo.vertical,
            investment_stage: combo.stage,
            investment_country: combo.country
        }).toArray();
        console.log(`Found ${matchingInvestments.length} matching investments`);

        matchingInvestments.forEach(inv => {
            if (!investorData[inv.investor_id]) {
                investorData[inv.investor_id] = {
                    combinations: {}
                };
            }
            const comboName = `${combo.vertical}-${combo.stage}-${combo.country}`;
            investorData[inv.investor_id].combinations[comboName] = inv.investments || 0;
        });
    }

    const investorIds = Object.keys(investorData);
    console.log(`Unique investor IDs found: ${investorIds.length}`);

    if (investorIds.length === 0) {
        console.log('No investor IDs found. Returning empty array.');
        return [];
    }

    console.log('Sample investor IDs:', investorIds.slice(0, 5));

    // Fetch full investor details
    const investors = await investorsCollection.find({
        _id: { $in: investorIds.map(id => {
            try {
                return new ObjectId(id);
            } catch (error) {
                console.error(`Invalid ObjectId: ${id}`);
                return null;
            }
        }).filter(id => id !== null) }
    }).toArray();

    console.log(`Fetched ${investors.length} investors from the database`);

    // Combine investor details with investment counts
    let detailedInvestors = investors.map(investor => ({
        ...investor,
        investmentCounts: investorData[investor._id.toString()].combinations
    }));

    // Sort investors by total investment count
    detailedInvestors.sort((a, b) => {
        const totalA = Object.values(a.investmentCounts).reduce((sum, count) => sum + count, 0);
        const totalB = Object.values(b.investmentCounts).reduce((sum, count) => sum + count, 0);
        return totalB - totalA;
    });

    if (detailedInvestors.length > 100) {
        detailedInvestors = detailedInvestors.slice(0, 100);
        console.log('Only returning first 100 investors, as there are more than 100');
    }

    return detailedInvestors;
}

async function matchInvestors(startupData) {
    try {
        const mappedData = await mapStartupData(startupData);
        console.log('Mapped Data:', JSON.stringify(mappedData, null, 2));
        const matchedInvestors = await fetchInvestors(mappedData);
        console.log(`Returning ${matchedInvestors.length} matched investors`);
        return matchedInvestors;
    } catch (error) {
        console.error('Error in matchInvestors:', error);
        throw error;
    }
}

module.exports = {
    connectToMongo,
    matchInvestors
};