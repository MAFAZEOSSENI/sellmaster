const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
  res.json({ message: 'API Admin - À implémenter' });
});

module.exports = router;