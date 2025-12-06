const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Token d\'authentification requis' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'votre_secret_jwt');
    req.userId = decoded.userId;
    req.userEmail = decoded.email;
    
    next();
  } catch (error) {
    console.error('Erreur authentification:', error);
    res.status(401).json({ error: 'Token invalide' });
  }
};

module.exports = authMiddleware;