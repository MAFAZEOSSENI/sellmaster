const path = require('path');

console.log('🔍 DIAGNOSTIC SHOPIFY SERVICE');
console.log('=' .repeat(50));

// 1. Vérifier le chemin
const servicePath = path.join(__dirname, 'services', 'shopifyService.js');
console.log('📁 Chemin du service:', servicePath);

// 2. Vérifier si le fichier existe
const fs = require('fs');
console.log('📄 Fichier existe:', fs.existsSync(servicePath));

// 3. Lire le contenu du fichier
if (fs.existsSync(servicePath)) {
  const content = fs.readFileSync(servicePath, 'utf8');
  console.log('📝 Premières 10 lignes:');
  console.log(content.split('\n').slice(0, 10).join('\n'));
  
  // Vérifier l'export
  if (content.includes('module.exports = new ShopifyService()')) {
    console.log('⚠️  PROBLÈME: Exporte une INSTANCE (new ShopifyService())');
  } else if (content.includes('module.exports = ShopifyService')) {
    console.log('✅ Exporte la CLASSE (ShopifyService)');
  }
}

// 4. Essayer d'importer
try {
  console.log('\n🔄 Tentative d\'import...');
  
  // Supprimer du cache si déjà importé
  delete require.cache[require.resolve('./services/shopifyService')];
  
  const ShopifyService = require('./services/shopifyService');
  console.log('✅ Import réussi');
  console.log('🔧 Type importé:', typeof ShopifyService);
  console.log('🔧 Est une classe?', ShopifyService.toString().includes('class ShopifyService'));
  console.log('🔧 Méthodes disponibles:', Object.getOwnPropertyNames(ShopifyService));
  
  // Vérifier testConnection
  console.log('🔧 testConnection existe?', typeof ShopifyService.testConnection);
  console.log('🔧 testConnection est fonction?', typeof ShopifyService.testConnection === 'function');
  
} catch (error) {
  console.error('❌ Erreur import:', error.message);
  console.error('Stack:', error.stack);
}

console.log('=' .repeat(50));