function positiveInt(value, fallback) {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function getAiConfig() {
  const provider = String(process.env.AI_PROVIDER || 'gemini').trim().toLowerCase();
  return {
    provider,
    apiKey: String(process.env.GOOGLE_AI_API_KEY || '').trim(),
    textModel: String(process.env.GEMINI_TEXT_MODEL || 'gemini-3.5-flash-lite').trim(),
    imageModel: String(process.env.GEMINI_IMAGE_MODEL || 'gemini-nano-banana-2.1').trim(),
    imageGenerationEnabled: String(process.env.AI_IMAGE_GENERATION_ENABLED || 'true').trim().toLowerCase() !== 'false',
    maxImagesPerPage: positiveInt(process.env.AI_MAX_IMAGES_PER_PAGE, 8),
    maxVariants: positiveInt(process.env.AI_MAX_IMAGE_VARIANTS, 4),
  };
}

module.exports = { getAiConfig, positiveInt };