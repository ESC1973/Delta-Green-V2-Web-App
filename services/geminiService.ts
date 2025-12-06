import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { ChatMessage, HandlerResponse, Character } from '../types';
import { SYSTEM_PROMPT } from '../constants';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        narrative: { type: Type.STRING, description: 'The Handler\'s narrative description of events and the environment.' },
        choices: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'An array of 3 to 4 distinct, concise choices for the player.'
        },
        awaitsRoll: { type: Type.BOOLEAN, description: 'True if the Handler is asking for a dice roll, otherwise false.' }
    },
    required: ['narrative', 'choices', 'awaitsRoll']
};

function formatHistoryForPrompt(history: ChatMessage[]): string {
    if (history.length === 0) {
        return "The session has just begun. There is no history yet.";
    }
    return history.map(msg => {
        if (msg.sender === 'handler') {
            return `HANDLER: ${msg.content}`;
        } else {
            return `PLAYER (${msg.characterName}): ${msg.content}`;
        }
    }).join('\n');
}

export async function generateHandlerResponse(history: ChatMessage[], context: string, characters: Character[]): Promise<HandlerResponse | null> {
    const model = 'gemini-2.5-flash';
    
    const fullPrompt = `
${SYSTEM_PROMPT}

--- CAMPAIGN CONTEXT ---
${context}
--- END CONTEXT ---

--- CURRENT SESSION LOG ---
${formatHistoryForPrompt(history)}
--- END SESSION LOG ---

Based on the last player action (or lack thereof, if this is the first turn), provide the next narrative beat as the Handler.
`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: responseSchema,
                temperature: 0.8,
                topP: 0.95,
            }
        });

        if (response.text) {
             const jsonText = response.text.trim();
             return JSON.parse(jsonText) as HandlerResponse;
        }
        return null;
    } catch (error) {
        console.error('Error generating handler response:', error);
        return null;
    }
}

export async function generateSummary(history: ChatMessage[], context: string): Promise<string> {
     const model = 'gemini-2.5-flash';
     const summaryPrompt = `
You are a helpful assistant for the Delta Green Handler AI. Your task is to summarize the provided session log into a concise, bulleted list of key events, decisions, and discoveries involving all agents. This summary will be used to create a campaign journal for future sessions.

--- CAMPAIGN CONTEXT (for your reference) ---
${context}
--- END CONTEXT ---

--- SESSION LOG TO SUMMARIZE ---
${formatHistoryForPrompt(history)}
--- END SESSION LOG ---

Please generate the summary.
`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: summaryPrompt,
            config: {
                temperature: 0.5,
            }
        });
        return response.text ?? "No summary could be generated.";
    } catch (error) {
        console.error('Error generating summary:', error);
        return "Error: Could not generate summary.";
    }
}