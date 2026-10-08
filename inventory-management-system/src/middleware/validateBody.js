const AppError = require('../utils/AppError');

// Ensures a JSON object body was sent
module.exports = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body) || Object.keys(req.body).length === 0) {
    return next(new AppError('Request body must be a non-empty JSON object', 400));
  }
  next();
};
