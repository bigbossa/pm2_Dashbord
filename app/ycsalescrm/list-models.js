
import dotenv from 'dotenv';
dotenv.config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
  
  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('Available Models:');
    if (data.models) {
        data.models.forEach(m => {
            if (m.supportedGenerationMethods.includes('generateContent')) {
                console.log('-', m.name);
            }
        });
    } else {
        console.log('No models found or error:', data);
    }
  } catch (error) {
    console.error('Error listing models:', error);
  }
}

listModels();
