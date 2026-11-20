const axios = require('axios');

function stripAndParseJson(text) {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
}

async function generateText(prompt, options = {}) {
  const apiUrl = process.env.AI_TEXT_API_URL;
  const apiKey = process.env.AI_TEXT_API_KEY;
  if (!apiUrl || !apiKey) {
    throw new Error('Génération IA texte non configurée. Renseignez AI_TEXT_API_URL et AI_TEXT_API_KEY.');
  }
  const response = await axios.post(apiUrl, {
    model: process.env.AI_TEXT_MODEL || 'gpt-4o-mini',
    temperature: options.temperature ?? 0.7,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Tu es un expert e-commerce francophone. Réponds uniquement en JSON valide. Ne confirme jamais une donnée non fournie.' },
      { role: 'user', content: prompt },
    ],
  }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 60000 });
  const text = response.data?.choices?.[0]?.message?.content;
  if (!text) throw new Error('Le fournisseur IA n’a retourné aucun texte.');
  return stripAndParseJson(text);
}

async function generateImage(prompt, { size = '1024x1024' } = {}) {
  const apiUrl = process.env.AI_IMAGE_API_URL;
  const apiKey = process.env.AI_IMAGE_API_KEY;
  if (!apiUrl || !apiKey) {
    throw new Error('Génération IA image non configurée. Renseignez AI_IMAGE_API_URL et AI_IMAGE_API_KEY.');
  }
  const response = await axios.post(apiUrl, {
    model: process.env.AI_IMAGE_MODEL || 'gpt-image-1',
    prompt,
    size,
  }, { headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, timeout: 120000 });
  const image = response.data?.data?.[0];
  const sourceUrl = image?.url || null;
  const b64 = image?.b64_json || null;
  if (!sourceUrl && !b64) throw new Error('Le fournisseur IA n’a retourné aucune image.');
  return { sourceUrl, b64 };
}

module.exports = { generateText, generateImage };