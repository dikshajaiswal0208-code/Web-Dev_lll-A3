const express = require('express');
const ctrl = require('../controllers/productController');
const validateObjectId = require('../middleware/validateObjectId');
const validateBody = require('../middleware/validateBody');

const router = express.Router();

// Validate :id automatically wherever it appears
router.param('id', validateObjectId);

// NOTE: static routes must be declared BEFORE '/:id'
router.get('/low-stock', ctrl.getLowStock);
router.get('/summary', ctrl.getCategorySummary);

router.route('/')
  .get(ctrl.getProducts)
  .post(validateBody, ctrl.createProduct);

router.route('/:id')
  .get(ctrl.getProductById)
  .put(validateBody, ctrl.updateProduct)
  .delete(ctrl.deleteProduct);

router.patch('/:id/stock', validateBody, ctrl.adjustStock);

module.exports = router;
