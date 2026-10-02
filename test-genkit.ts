import { gemini15Flash, googleAI } from '@genkit-ai/googleai';
import { genkit } from 'genkit';
import { enableFirebaseTelemetry } from '@genkit-ai/firebase';
import dotenv from 'dotenv';
import path from 'path';

// Load the root .env file containing GOOGLE_GENAI_API_KEY
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

process.env.GCLOUD_PROJECT = 'effective-moment-8dtd0';
enableFirebaseTelemetry({ projectId: "effective-moment-8dtd0" });

// configure a Genkit instance
const ai = genkit({
    plugins: [googleAI()],
    model: gemini15Flash, // set default model
});

const helloFlow = ai.defineFlow('helloFlow', async (name: string) => {
    // make a generation request
    const { text } = await ai.generate(`Hello Gemini, my name is ${name}`);
    console.log(text);
});

helloFlow('Chris').catch(console.error);
