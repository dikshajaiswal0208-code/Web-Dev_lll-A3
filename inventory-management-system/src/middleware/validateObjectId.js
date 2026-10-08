const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

// Used with router.param('id', validateObjectId)
module.exports = (req, res, next, id) => {
  if (!mongoose.isValidObjectId(id)) {
    return next(new AppError(`Invalid product ID: ${id}`, 400));
  }
  next();
};
