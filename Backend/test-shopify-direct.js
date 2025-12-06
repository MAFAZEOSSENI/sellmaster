const axios = require('axios');

async function testDirectConnection() {
  const shopName = 'nd00pt-bd';
  const accessToken = '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';
  
  console.log('🧪 TEST DIRECT SHOPIFY CONNEXION');
  console.log('================================');
  
  try {
    const url = `https://${shopName}.myshopify.com/admin/api/2024-01/products.json?limit=1`;
    console.log(`URL: ${url}`);
    console.log(`Token: ${accessToken.substring(0, 20)}...`);
    
    const response = await axios.get(url, {
      headers: {
        'X-Shopify-Access-Token': accessToken,
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });
    
    console.log('✅ SUCCÈS!');
    console.log(`Status: ${response.status}`);
    console.log(`Data keys: ${Object.keys(response.data)}`);
    console.log(`Products count: ${response.data.products ? response.data.products.length : 0}`);
    
    return true;
  } catch (error) {
    console.error('❌ ÉCHEC!');
    
    if (error.response) {
      console.error(`Response Status: ${error.response.status}`);
      console.error(`Response Data:`, error.response.data);
    } else if (error.request) {
      console.error('No response received');
    } else {
      console.error('Error:', error.message);
    }
    
    return false;
  }
}

// Exécuter le test
testDirectConnection().then(result => {
  console.log('\n📊 RÉSULTAT FINAL:', result ? '✅ CONNECTÉ' : '❌ DÉCONNECTÉ');
  process.exit(result ? 0 : 1);
});