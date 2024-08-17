const OpenAI = require("openai");
const { z } = require("zod");
const { zodResponseFormat } = require("openai/helpers/zod");
const { VERTICALS, INDUSTRIES } = require('./constants');

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

const StartupSchema = z.object({
    companyName: z.string(),
    industries: z.array(z.enum(INDUSTRIES)),
    verticals: z.array(z.enum(VERTICALS)),
    startupLocation: z.string(),
    startupIntro: z.string(),
    fundAsk: z.number({ float: true }),
    fundingStage: z.enum(["Seed", "Series A", "Series B", "Series C", "Series D+"]),
    lastFundingRound: z.object({
        amount: z.number({ float: true }),
        stage: z.enum(["Bootstrapped", "Pre-seed", "Seed", "Series A", "Series B", "Series C", "Series D+"]),
    }),
});

async function extractStructuredData(generalInfo, websiteContent) {
    const prompt = `
    Extract structured information about a startup based on the following data:

    General Info:
    ${generalInfo}

    Website Content:
    ${websiteContent}

    Provide the information in the required structure. For industries and verticals, use the following predefined categories as a guide:

    Industries: ${INDUSTRIES.join(', ')}

    Verticals: ${VERTICALS.join(', ')}

    Important: Always provide at least one industry and one vertical that best describes the startup, even if it's not an exact match. If the startup's focus doesn't precisely fit the predefined categories, choose the closest matches or use a combination of categories that best represent the startup's domain.

    startupIntro gives an overview of the startup and describes what it does.
    
    fundAsk and fundingStage are the estimated fund ask and funding stage of the startup basis, the last funding round primarily, also basis on what the company does and it's location. If the last funding round is Pre-seed or seed, fundingStage will be series A, if last is series A, fundingStage will be series B, and so on. Similarly, if the last funding round was 2 million, fundAsk could be 7 million, if the last finding round was 6 million, fundAsk could be 15 million, if the last funding round was 150, fundAsk could be 250. It would always be more than the last funding round.
    If there were no previous funding round, fundAsk could be between 0.5 to 2 and fundingStage could be Seed or SeriesA.

    Provide the fundAsk and amount number in $millions. For example, instead of 3500000, provide 3.5.

    For last funding round, provide only factual data, do not make it up. Use 0 and "Bootstrapped" as the default values.
    `;

    try {
        const completion = await openai.beta.chat.completions.parse({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a world class researcher and investor matchmaker at Qubit Capital, a digital investment bank which helps startups connect and raise capital from potential investors.You do structured data extraction for helping startups find suitable investors. Extract the required information based on the given data." },
                { role: "user", content: prompt }
            ],
            response_format: zodResponseFormat(StartupSchema, "startup_info_extraction"),
        });

        const extractedData = completion.choices[0].message.parsed;
        console.log(extractedData)
        console.log('Extracted Structured Data:', JSON.stringify(extractedData, null, 2));
        return extractedData;
    } catch (error) {
        console.error('Error extracting structured data:', error);
        throw error;
    }
}

module.exports = { extractStructuredData };