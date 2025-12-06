const express = require('express');
const router = express.Router();

// Routes temporaires
router.get('/', (req, res) => {
  res.json({ message: 'API Licences - À implémenter' });
});

module.exports = router;