const AIDA_SECTIONS = [
  { id: 'hero', stage: 'attention', imageType: 'hero' },
  { id: 'interest', stage: 'interest', imageType: 'lifestyle' },
  { id: 'desire', stage: 'desire', imageType: 'benefit' },
  { id: 'action', stage: 'action', imageType: 'offer' },
];

function normalizeAidaCopy(content) {
  const sectionsById = new Map(
    (Array.isArray(content?.sections) ? content.sections : []).map((section) => [section.id, section]),
  );
  const sections = AIDA_SECTIONS.map((definition) => ({
    ...(sectionsById.get(definition.id) || {}),
    ...definition,
  }));

  return {
    ...(content && typeof content === 'object' ? content : {}),
    framework: 'AIDA',
    sections,
    warnings: Array.isArray(content?.warnings) ? content.warnings : [],
  };
}

module.exports = { normalizeAidaCopy };