/**
 * gemini.service.js — Google Gemini API wrapper.
 * Handles content generation with retry logic for rate limit errors.
 */
const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI = null;

const getClient = () => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY not configured.');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

/**
 * Generate content from Gemini with exponential backoff on rate limits.
 * @param {string} prompt - The full prompt to send
 * @param {string} modelName - Model to use (default: gemini-1.5-flash)
 * @returns {Promise<string>} The generated text response
 */
const generateContent = async (prompt, modelName = 'gemini-2.0-flash') => {
  const client = getClient();
  const model = client.getGenerativeModel({ model: modelName });

  const MAX_RETRIES = 3;
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const result = await model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err) {
      lastError = err;
      // Rate limit: wait exponentially
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        const waitMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(`[Gemini] Rate limited. Retrying in ${waitMs}ms (attempt ${attempt + 1})`);
        await new Promise((r) => setTimeout(r, waitMs));
      } else {
        // Non-retriable error
        throw err;
      }
    }
  }

  throw new Error(`Gemini API failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
};

/**
 * Parse JSON from Gemini response (Gemini often wraps JSON in markdown code blocks).
 * @param {string} text - Raw Gemini response text
 * @returns {*} Parsed JSON object
 */
const parseGeminiJson = (text) => {
  // Strip markdown code fences if present
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();
  return JSON.parse(cleaned);
};

module.exports = { generateContent, parseGeminiJson };
