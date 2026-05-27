/**
 * pdfExtract.service.js — PDF extraction + AI structuring pipeline.
 *
 * Pipeline:
 * 1. Extract text from PDF buffer using pdfjs-dist (Mozilla PDF.js — reliable in Node 24)
 * 2. Clean and chunk extracted text
 * 3. Send to AI (Groq/Gemini) with structured prompt
 * 4. Parse AI response as nested block hierarchy
 * 5. Return block definitions for the batch-create endpoint
 */
const { generateContent, parseAIJson } = require('./ai.service');

/**
 * Extract text from a PDF buffer using pdfjs-dist.
 * @param {Buffer} buffer - PDF file buffer (from multer)
 * @returns {Promise<string>} Extracted text
 */
const extractTextFromPdf = async (buffer) => {
  try {
    // pdfjs-dist/legacy works reliably in CommonJS Node.js (including Node 24)
    const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');

    // Disable the worker for server-side Node.js (worker is for browser only)
    pdfjsLib.GlobalWorkerOptions.workerSrc = '';

    const uint8Array = new Uint8Array(buffer);
    const loadingTask = pdfjsLib.getDocument({
      data: uint8Array,
      useWorkerFetch: false,
      isEvalSupported: false,
      useSystemFonts: true,
    });

    const pdf = await loadingTask.promise;
    let fullText = '';

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const content = await page.getTextContent();
      // Join text items, preserving line breaks where applicable
      const pageText = content.items
        .map((item) => item.str)
        .join(' ')
        .replace(/\s{3,}/g, '\n'); // Collapse excess whitespace into newlines
      fullText += `\n${pageText}`;
    }

    return fullText.trim();
  } catch (err) {
    throw new Error(`PDF text extraction failed: ${err.message}`);
  }
};

/**
 * Fallback: Convert raw text into blocks WITHOUT AI.
 * Splits on newlines/sentence boundaries into heading + checkbox blocks.
 * Used when all AI providers are rate-limited or unavailable.
 */
const generateTextBlocks = (rawText) => {
  const lines = rawText
    .split(/\n+/)
    .map(l => l.trim())
    .filter(l => l.length > 3 && l.length < 300); // Skip empty or very long lines

  const blocks = [];
  let order = 1000;
  let currentHeadingTempId = null;

  lines.slice(0, 80).forEach((line, idx) => { // Cap at 80 items
    const tempId = `b${idx + 1}`;
    // Heuristic: short lines (< 60 chars) that end without punctuation = headings
    const isHeading = line.length < 70 && !/[.?!,;]$/.test(line) && line === line.trim();

    if (isHeading && blocks.length % 8 === 0) {
      // New section heading
      currentHeadingTempId = tempId;
      blocks.push({
        tempId,
        parentTempId: null,
        type: 'heading2',
        content: line,
        textContent: line,
        order,
      });
    } else {
      // Content line as checkbox item
      blocks.push({
        tempId,
        parentTempId: currentHeadingTempId,
        type: 'checkbox',
        content: line.slice(0, 200),
        textContent: line.slice(0, 200),
        order,
      });
    }
    order += 1000;
  });

  return blocks;
};

/**
 * Send extracted text to AI to structure it as a nested block hierarchy.
 * @param {string} rawText - Extracted PDF text
 * @param {string} context - Extra context (e.g., "this is an IT syllabus")
 * @returns {Promise<Array>} Array of block definitions with tempId + parentTempId
 */
const structureWithAI = async (rawText, context = '') => {
  // Limit text to avoid token overflow
  const trimmedText = rawText.slice(0, 12000);

  const prompt = `You are a student organization assistant. I have extracted text from a PDF document.
${context ? `Context: ${context}` : ''}

Your task: Parse this content and return it as a JSON array of "block" objects that represent a hierarchical outline.

Rules:
1. Use "heading1" for major sections/units
2. Use "heading2" for sub-sections/topics
3. Use "checkbox" for specific topics, tasks, or items that can be completed
4. Use "text" for descriptions or notes
5. Each block has: tempId (string, e.g. "b1"), parentTempId (null or parent's tempId), type, content (plain text)
6. Keep content concise (max 200 chars per block)
7. Return ONLY valid JSON array, no other text
8. Maximum 100 blocks total

Example output:
[
  {"tempId": "b1", "parentTempId": null, "type": "heading1", "content": "Unit 1: Introduction"},
  {"tempId": "b2", "parentTempId": "b1", "type": "heading2", "content": "Chapter 1.1: Basics"},
  {"tempId": "b3", "parentTempId": "b2", "type": "checkbox", "content": "Understand key concepts"},
  {"tempId": "b4", "parentTempId": null, "type": "heading1", "content": "Unit 2: Advanced Topics"}
]

PDF Content:
---
${trimmedText}
---

Return the JSON array now:`;

  const responseText = await generateContent(prompt);

  let blocks;
  try {
    blocks = parseAIJson(responseText);
  } catch (err) {
    throw new Error(`AI response was not valid JSON: ${err.message}`);
  }

  if (!Array.isArray(blocks)) {
    throw new Error('AI response must be a JSON array.');
  }

  // Assign order values
  const orderCounters = {};
  const processedBlocks = blocks.map((block) => {
    const key = block.parentTempId || 'root';
    orderCounters[key] = (orderCounters[key] || 0) + 1000;
    return {
      ...block,
      order: orderCounters[key],
      textContent: block.content || '',
    };
  });

  return processedBlocks;
};

/**
 * Full pipeline: buffer → text → structured blocks
 * Falls back to rule-based block generation when AI is unavailable.
 */
const processPdf = async (buffer, context = '') => {
  const rawText = await extractTextFromPdf(buffer);

  let blocks;
  let usedAI = true;

  try {
    blocks = await structureWithAI(rawText, context);
  } catch (aiErr) {
    // AI quota exceeded or unavailable — use text-based fallback
    console.warn(`[PDF] AI structuring unavailable: ${aiErr.message.split('\n')[0]}. Using text fallback.`);
    blocks = generateTextBlocks(rawText);
    usedAI = false;
  }

  return { blocks, rawTextLength: rawText.length, usedAI };
};

module.exports = { processPdf, extractTextFromPdf, structureWithAI, generateTextBlocks };
