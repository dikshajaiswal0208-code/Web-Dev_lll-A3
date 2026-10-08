const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { escapeRegex, toNumber, pick } = require('../utils/helpers');

const WRITABLE_FIELDS = ['name', 'sku', 'category', 'price', 'quantity', 'reorderLevel', 'supplier'];
const SORTABLE_FIELDS = ['name', 'sku', 'category', 'price', 'quantity', 'reorderLevel', 'supplier', 'createdAt', 'updatedAt'];

/* ------------------------------------------------------------------ *
 * POST /api/products
 * ------------------------------------------------------------------ */
exports.createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(pick(req.body, WRITABLE_FIELDS));
  res.status(201).json(product);
});

/* ------------------------------------------------------------------ *
 * GET /api/products
 * Query: category, supplier, search, minPrice, maxPrice, inStock,
 *        sort (e.g. -price,name), page, limit
 * ------------------------------------------------------------------ */
exports.getProducts = asyncHandler(async (req, res) => {
  const { category, supplier, search, minPrice, maxPrice, inStock, sort } = req.query;
  const filter = {};

  // Filtering
  if (category) filter.category = { $regex: `^${escapeRegex(category)}$`, $options: 'i' };
  if (supplier) filter.supplier = { $regex: escapeRegex(supplier), $options: 'i' };
  if (search) {
    const rx = { $regex: escapeRegex(search), $options: 'i' };
    filter.$or = [{ name: rx }, { sku: rx }];
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) filter.price.$gte = toNumber(minPrice, 'minPrice');
    if (maxPrice !== undefined) filter.price.$lte = toNumber(maxPrice, 'maxPrice');
  }
  if (inStock !== undefined) {
    if (!['true', 'false'].includes(inStock)) throw new AppError("Query parameter 'inStock' must be true or false", 400);
    filter.quantity = inStock === 'true' ? { $gt: 0 } : 0;
  }

  // Sorting (whitelisted fields only)
  let sortBy = '-createdAt';
  if (sort) {
    const fields = String(sort).split(',').map((f) => f.trim()).filter(Boolean);
    const invalid = fields.filter((f) => !SORTABLE_FIELDS.includes(f.replace(/^-/, '')));
    if (invalid.length) {
      throw new AppError(`Cannot sort by: ${invalid.join(', ')}. Allowed: ${SORTABLE_FIELDS.join(', ')}`, 400);
    }
    if (fields.length) sortBy = fields.join(' ');
  }

  // Pagination
  const page = req.query.page !== undefined ? toNumber(req.query.page, 'page') : 1;
  const limit = req.query.limit !== undefined ? toNumber(req.query.limit, 'limit') : 10;
  if (!Number.isInteger(page) || page < 1) throw new AppError("'page' must be an integer >= 1", 400);
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new AppError("'limit' must be an integer between 1 and 100", 400);

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter).sort(sortBy).skip((page - 1) * limit).limit(limit),
  ]);

  res.status(200).json({
    success: true,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    count: products.length,
    products,
  });
});

/* ------------------------------------------------------------------ *
 * GET /api/products/:id
 * ------------------------------------------------------------------ */
exports.getProductById = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  res.status(200).json(product);
});

/* ------------------------------------------------------------------ *
 * PUT /api/products/:id   (partial updates allowed)
 * ------------------------------------------------------------------ */
exports.updateProduct = asyncHandler(async (req, res) => {
  const updates = pick(req.body, WRITABLE_FIELDS);
  if (Object.keys(updates).length === 0) throw new AppError('No valid fields provided to update', 400);

  const product = await Product.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  if (!product) throw new AppError('Product not found', 404);
  res.status(200).json(product);
});

/* ------------------------------------------------------------------ *
 * PATCH /api/products/:id/stock
 * Body: { "change": 10 }  (positive = restock, negative = sale)
 *   or  { "type": "restock" | "sale", "quantity": 5 }
 * Uses an atomic $inc with a guard so stock can never go negative,
 * even with concurrent requests.
 * ------------------------------------------------------------------ */
exports.adjustStock = asyncHandler(async (req, res) => {
  const { change, type, quantity } = req.body;
  let delta;

  if (change !== undefined) {
    delta = change;
  } else if (type !== undefined && quantity !== undefined) {
    if (!['restock', 'sale'].includes(type)) throw new AppError("'type' must be 'restock' or 'sale'", 400);
    if (typeof quantity !== 'number' || quantity <= 0) throw new AppError("'quantity' must be a positive number", 400);
    delta = type === 'sale' ? -quantity : quantity;
  } else {
    throw new AppError("Provide either 'change' or both 'type' and 'quantity'", 400);
  }

  if (typeof delta !== 'number' || !Number.isInteger(delta) || delta === 0) {
    throw new AppError('Stock change must be a non-zero whole number', 400);
  }

  // Guard: for a sale, only match when enough stock is available
  const query = { _id: req.params.id };
  if (delta < 0) query.quantity = { $gte: -delta };

  const product = await Product.findOneAndUpdate(query, { $inc: { quantity: delta } }, { new: true, runValidators: true });

  if (!product) {
    const exists = await Product.findById(req.params.id).select('quantity');
    if (!exists) throw new AppError('Product not found', 404);
    throw new AppError(`Insufficient stock. Available: ${exists.quantity}, requested: ${-delta}`, 400);
  }

  res.status(200).json({ message: 'Stock updated', product });
});

/* ------------------------------------------------------------------ *
 * DELETE /api/products/:id
 * ------------------------------------------------------------------ */
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  res.status(200).json({ message: 'Product deleted', id: product._id });
});

/* ------------------------------------------------------------------ *
 * GET /api/products/low-stock   (quantity <= reorderLevel)
 * ------------------------------------------------------------------ */
exports.getLowStock = asyncHandler(async (req, res) => {
  const results = await Product.aggregate([
    { $match: { $expr: { $lte: ['$quantity', '$reorderLevel'] } } },
    { $sort: { quantity: 1, name: 1 } },
  ]);

  // aggregate() returns plain objects, so add the same fields the virtuals provide
  const lowStockItems = results.map((p) => ({ ...p, stockValue: p.price * p.quantity, id: String(p._id) }));

  res.status(200).json({ count: lowStockItems.length, lowStockItems });
});

/* ------------------------------------------------------------------ *
 * GET /api/products/summary   (category-wise aggregation)
 * ------------------------------------------------------------------ */
exports.getCategorySummary = asyncHandler(async (req, res) => {
  const summary = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        totalItems: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalStockValue: { $sum: { $multiply: ['$price', '$quantity'] } },
        avgPrice: { $avg: '$price' },
      },
    },
    { $addFields: { avgPrice: { $round: ['$avgPrice', 2] } } },
    { $sort: { totalStockValue: -1 } },
  ]);

  res.status(200).json({ categories: summary.length, summary });
});
