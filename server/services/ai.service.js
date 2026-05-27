/**
 * ai.service.js — Unified AI service with multi-provider support.
 *
 * Provider priority:
 *   1. Groq (FREE — Llama 3.3 70B, 30 RPM, no credit card needed)
 *   2. Gemini (fallback — if GEMINI_API_KEY set and Groq fails)
 *   3. Claude (optional — if ANTHROPIC_API_KEY set, best quality but paid)
 *
 * To use Groq:  get a free key at https://console.groq.com → set GROQ_API_KEY in .env
 * To use Claude: get a key at https://console.anthropic.com → set ANTHROPIC_API_KEY in .env
 */

// ── Groq Client (lazy init) ───────────────────────────────────────────────────
let groqClient = null;
const getGroqClient = () => {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) return null;
    const Groq = require('groq-sdk');
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
};

// ── Gemini Client (lazy init) ─────────────────────────────────────────────────
let genAI = null;
const getGeminiClient = () => {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) return null;
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
};

// ── Groq Generation ───────────────────────────────────────────────────────────
const generateWithGroq = async (prompt, model = 'llama-3.3-70b-versatile') => {
  const client = getGroqClient();
  if (!client) throw new Error('GROQ_API_KEY not configured.');

  const MAX_RETRIES = 3;
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const completion = await client.chat.completions.create({
        messages: [{ role: 'user', content: prompt }],
        model,
        temperature: 0.7,
        max_tokens: 4096,
      });
      return completion.choices[0]?.message?.content || '';
    } catch (err) {
      lastError = err;
      const status = err.status || err.statusCode;
      if (status === 429) {
        // Rate limited — exponential backoff
        const waitMs = Math.pow(2, attempt) * 2000 + Math.random() * 500;
        console.warn(`[Groq] Rate limited. Retrying in ${Math.round(waitMs)}ms (attempt ${attempt + 1})`);
        await new Promise((r) => setTimeout(r, waitMs));
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Groq API failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
};

// ── Gemini Generation ─────────────────────────────────────────────────────────
const generateWithGemini = async (prompt, model = 'gemini-2.0-flash') => {
  const client = getGeminiClient();
  if (!client) throw new Error('GEMINI_API_KEY not configured.');

  const MAX_RETRIES = 3;
  let lastError;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      const geminiModel = client.getGenerativeModel({ model });
      const result = await geminiModel.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch (err) {
      lastError = err;
      if (err.message?.includes('429') || err.message?.includes('quota')) {
        const waitMs = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(`[Gemini] Rate limited. Retrying in ${waitMs}ms (attempt ${attempt + 1})`);
        await new Promise((r) => setTimeout(r, waitMs));
      } else {
        throw err;
      }
    }
  }
  throw new Error(`Gemini API failed after ${MAX_RETRIES} retries: ${lastError?.message}`);
};

// ── Main Generate Function (tries providers in order) ─────────────────────────
/**
 * Generate content using the best available AI provider.
 * Falls back automatically: Groq → Gemini
 * @param {string} prompt - The prompt to send
 * @returns {Promise<string>} Generated text
 */
const generateContent = async (prompt) => {
  const errors = [];

  // 1. Try Groq (free tier, generous limits)
  if (process.env.GROQ_API_KEY) {
    try {
      console.log('[AI] Using Groq (Llama 3.3 70B)');
      return await generateWithGroq(prompt);
    } catch (err) {
      console.warn(`[AI] Groq failed: ${err.message}. Trying fallback...`);
      errors.push(`Groq: ${err.message}`);
    }
  }

  // 2. Try Gemini (fallback)
  if (process.env.GEMINI_API_KEY) {
    try {
      console.log('[AI] Using Gemini (2.0 Flash)');
      return await generateWithGemini(prompt);
    } catch (err) {
      console.warn(`[AI] Gemini failed: ${err.message}`);
      errors.push(`Gemini: ${err.message}`);
    }
  }

  // All providers failed
  throw new Error(
    `All AI providers failed. Configure GROQ_API_KEY (free at console.groq.com) or GEMINI_API_KEY.\n` +
    `Errors:\n${errors.join('\n')}`
  );
};

/**
 * Parse JSON from an AI response (strips markdown code fences if present).
 * @param {string} text - Raw AI response text
 * @returns {*} Parsed JSON object
 */
const parseAIJson = (text) => {
  const cleaned = text
    .replace(/```json\s*/gi, '')
    .replace(/```\s*/gi, '')
    .trim();
  return JSON.parse(cleaned);
};

// Legacy alias for compatibility with existing imports
const parseGeminiJson = parseAIJson;

module.exports = { generateContent, parseAIJson, parseGeminiJson };
