const express = require('express');
const LicenseController = require('./licenseController');
const authMiddleware = require('../../middleware/authMiddleware');

const router = express.Router();

// Routes protégées
router.get('/', authMiddleware, LicenseController.getUserLicenses);
router.get('/status', authMiddleware, LicenseController.getLicenseStatus);
router.post('/activate', authMiddleware, LicenseController.activateLicense);
router.post('/test/generate', authMiddleware, LicenseController.generateTestLicense);

module.exports = router;