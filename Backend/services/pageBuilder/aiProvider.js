const axios = require('axios');
const { GoogleGenAI } = require('@google/genai');
const { getAiConfig } = require('./aiConfig');
const { assertSafePublicUrl } = require('../../utils/pageBuilderUrl');

async function withGeminiRetry(operation, options = {}) {
  const maxAttempts = options.maxAttempts || 3;
  const delayMs = options.delayMs ?? 1000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      const status = Number(error?.status || error?.statusCode || error?.response?.status);
      if (status < 500 || status > 599 || attempt === maxAttempts) throw error;

      console.warn('[Gemini] Temporary server error; retrying request', {
        status,
        attempt,
        model: options.model,
      });
      await new Promise((resolve) => setTimeout(resolve, delayMs * (2 ** (attempt - 1))));
    }
  }
}

function stripAndParseJson(text) {
  const cleaned = String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  if (!cleaned) throw new Error('Gemini n’a retourné aucun texte exploitable.');
  try {
    return JSON.parse(cleaned);
  } catch (_) {
    throw new Error('Gemini a retourné une réponse qui n’est pas un JSON valide.');
  }
}

function buildGeminiClientOptions(config, apiVersion) {
  return {
    apiKey: config.apiKey,
    ...(apiVersion ? { apiVersion } : {}),
  };
}

function createClient(apiVersion) {
  const config = getAiConfig();
  if (config.provider !== 'gemini') throw new Error(`Provider IA non pris en charge: ${config.provider}`);
  if (!config.apiKey) throw new Error('Génération IA Gemini non configurée. Renseignez GOOGLE_AI_API_KEY.');
  return { ai: new GoogleGenAI(buildGeminiClientOptions(config, apiVersion)), config };
}

function classifyGeminiError(error) {
  const status = error?.status || error?.statusCode || error?.response?.status;
  const message = error?.message || '';
  if (status === 429 || /quota|rate.?limit/i.test(message)) return new Error('Quota ou limite Gemini atteint. Réessayez plus tard.');
  if (status === 401 || status === 403 || /API_KEY|auth|permission/i.test(message)) return new Error('Clé Gemini invalide ou accès refusé.');
  if (/timeout|deadline|ETIMEDOUT|ECONNRESET/i.test(message)) return new Error('Gemini a expiré avant de terminer la génération.');
  if (status >= 500) return new Error('Le service Gemini est temporairement indisponible.');
  return new Error(message || 'Erreur inattendue auprès de Gemini.');
}

function buildGeminiImageInput(prompt, references = []) {
  return [
    { type: 'text', text: prompt },
    ...references.map((reference) => ({
      type: 'image',
      mime_type: reference.mimeType,
      data: reference.data,
    })),
  ];
}

function extractGeneratedImages(interaction) {
  const images = [];
  const seen = new Set();
  const addImage = (image) => {
    if (!image?.data || typeof image.data !== 'string') return;
    if (seen.has(image.data)) return;
    seen.add(image.data);
    images.push({
      sourceUrl: null,
      b64: image.data,
      mimeType: image.mime_type || image.mimeType || 'image/png',
    });
  };

  addImage(interaction?.output_image);
  for (const step of interaction?.steps || []) {
    if (step?.type !== 'model_output') continue;
    for (const item of step.content || []) {
      if (item?.type === 'image') addImage(item);
    }
  }
  return images;
}

async function generateText(prompt, options = {}) {
  const { ai, config } = createClient();
  try {
    const response = await withGeminiRetry(() => ai.models.generateContent({
        model: config.textModel,
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          systemInstruction: 'Tu es un expert e-commerce francophone. Réponds uniquement en JSON valide. Ne confirme jamais une donnée non fournie. Ne fabrique ni témoignage, ni garantie, ni certification, ni performance médicale ou technique non confirmée.',
          responseMimeType: 'application/json',
          temperature: options.temperature,
          maxOutputTokens: options.maxOutputTokens || 4096,
          httpOptions: { timeout: 60000 },
        },
      }), { model: config.textModel });
    return stripAndParseJson(response?.text);
  } catch (error) {
    throw classifyGeminiError(error);
  }
}

async function downloadImageReference(sourceUrl) {
  if (typeof sourceUrl !== 'string' || !/^https:\/\//i.test(sourceUrl)) return null;
  try {
    await assertSafePublicUrl(sourceUrl);
    const response = await axios.get(sourceUrl, {
      timeout: 15000,
      responseType: 'arraybuffer',
      maxRedirects: 2,
      maxContentLength: 8 * 1024 * 1024,
      validateStatus: (status) => status >= 200 && status < 300,
    });
    const mimeType = String(response.headers['content-type'] || '').split(';')[0].toLowerCase();
    if (!/^image\/(jpeg|png|webp)$/i.test(mimeType)) return null;
    return { data: Buffer.from(response.data).toString('base64'), mimeType };
  } catch (_) {
    return null;
  }
}

async function generateImage(prompt, options = {}) {
  const { ai, config } = createClient('v1beta');
  if (!config.imageGenerationEnabled) throw new Error('La génération d’images Gemini est désactivée.');

  const ratioMap = { '1:1': '1:1', '4:5': '4:5', '3:4': '3:4', '16:9': '16:9', '9:16': '9:16' };
  const aspectRatio = ratioMap[options.aspectRatio || options.ratio] || '1:1';
  const imagePrompt = `${prompt}\n\nRespecter exactement la forme, la couleur, les proportions, le nombre d’éléments, le packaging et les détails visibles du produit de référence. Ne pas inventer de texte, marque, garantie, certification, badge, prix ou produit différent.`;
  const references = [];

  if (Array.isArray(options.referenceImages)) {
    for (const sourceUrl of options.referenceImages.slice(0, 3)) {
      const reference = await downloadImageReference(sourceUrl);
      if (reference) references.push(reference);
    }
  }

  try {
    const response = await withGeminiRetry(() => ai.interactions.create({
      model: config.imageModel,
      input: buildGeminiImageInput(imagePrompt, references),
      response_format: { type: 'image', aspect_ratio: aspectRatio },
    }, { timeout_ms: 120000 }), { model: config.imageModel });

    const images = extractGeneratedImages(response);
    if (!images.length) throw new Error('Gemini n’a retourné aucune image.');
    return { sourceUrl: null, images };
  } catch (error) {
    throw classifyGeminiError(error);
  }
}

module.exports = {
  generateText,
  generateImage,
  stripAndParseJson,
  withGeminiRetry,
  buildGeminiImageInput,
  buildGeminiClientOptions,
  extractGeneratedImages,
};
