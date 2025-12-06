const express = require('express');
const AuthController = require('./authController');
const authMiddleware = require('../../middleware/authMiddleware'); // ✅ MAINTENANT DANS LE MÊME DOSSIER

const router = express.Router();

// Routes publiques
router.post('/register', AuthController.register);
router.post('/login', AuthController.login);

// Routes protégées
router.get('/profile', authMiddleware, AuthController.getProfile);

module.exports = router;