
import { GoogleGenAI } from "@google/genai";
import type { Customer } from '../types';

if (!process.env.API_KEY) {
    console.warn("API_KEY environment variable not set. Gemini API features will not work.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

export const generateFollowUpMessage = async (customer: Customer): Promise<string> => {
    if (!process.env.API_KEY) {
        return Promise.resolve("AI features are disabled. Please set your API_KEY.");
    }

    const noteHistory = customer.notes.map(note => `- ${note.content} (On ${note.createdAt.toLocaleDateString()})`).join('\n');

    const prompt = `
    You are a helpful assistant for a sales representative at "Sri Lakshmi Industries", a company that sells food processing machinery like murukku and snacks makers.
    Your task is to generate a polite and professional follow-up message (in English) for a customer.

    Customer Details:
    - Name: ${customer.name}
    - Business Type: ${customer.businessType}
    - Location: ${customer.location}
    - Current Pipeline Stage: ${customer.stage}

    Previous Communications (Notes):
    ${noteHistory || 'No notes available.'}

    Based on this information, generate a short, effective, and friendly follow-up message to continue the conversation. 
    The goal is to move the customer to the next stage of the pipeline. Do not include greetings like "Dear [Name]". Just provide the message content.
    `;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                temperature: 0.7,
            }
        });
        return response.text;
    } catch (error) {
        console.error("Error calling Gemini API:", error);
        return "Sorry, I couldn't generate a message at this time. Please check the API key and configuration.";
    }
};
