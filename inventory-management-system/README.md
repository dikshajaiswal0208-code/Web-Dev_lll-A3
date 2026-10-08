# Assignment 3 – Inventory and Data Management System

RESTful backend built with **Node.js, Express.js, MongoDB (Mongoose)** and **dotenv**.

## Project Structure

```
inventory-management-system/
├── server.js                      # Entry point (loads env, connects DB, starts server)
├── package.json
├── .env / .env.example            # PORT, NODE_ENV, MONGO_URI
├── seed/
│   └── seed.js                    # Inserts 12 sample products
├── docs/
│   └── Inventory_API.postman_collection.json
└── src/
    ├── app.js                     # Express app, middleware & route mounting
    ├── config/db.js               # Mongoose connection
    ├── models/Product.js          # Schema + validation + stockValue virtual
    ├── controllers/productController.js
    ├── routes/productRoutes.js
    ├── middleware/
    │   ├── errorHandler.js        # 404 + centralized error handler
    │   ├── validateObjectId.js    # Validates :id param
    │   ├── validateBody.js        # Ensures non-empty JSON body
    │   └── logger.js
    └── utils/
        ├── AppError.js
        ├── asyncHandler.js
        └── helpers.js
```

## Setup

1. Install and start MongoDB locally (or use MongoDB Atlas and paste its URI in `.env`).
2. Install dependencies and run:
   ```bash
   npm install
   npm run seed     # optional: load sample data
   npm start        # or: npm run dev
   ```
3. API runs at `http://localhost:5000`.

## Endpoints

| Method | URL | Description |
|--------|-----|-------------|
| POST   | `/api/products` | Create product (201) |
| GET    | `/api/products` | List with filter / sort / pagination |
| GET    | `/api/products/:id` | Single product |
| PUT    | `/api/products/:id` | Update details (partial allowed) |
| PATCH  | `/api/products/:id/stock` | Restock / sale: `{ "change": 10 }` or `{ "type": "sale", "quantity": 5 }` |
| DELETE | `/api/products/:id` | Delete product |
| GET    | `/api/products/low-stock` | Items where `quantity <= reorderLevel` (aggregation) |
| GET    | `/api/products/summary` | Category-wise totals & average price (aggregation) |

### List query parameters
`category`, `supplier`, `search` (name/SKU), `minPrice`, `maxPrice`, `inStock=true|false`,
`sort` (comma separated, `-` for desc, e.g. `-price,name`), `page` (default 1), `limit` (default 10, max 100).

Example: `GET /api/products?category=Electronics&minPrice=500&sort=-price&page=1&limit=5`

### Product schema
| Field | Rules |
|-------|-------|
| name | required, 2–100 chars, trimmed |
| sku | required, unique, uppercased, letters/numbers/hyphens |
| category | required, one of Electronics, Apparel, Furniture, Stationery, Groceries, Other |
| price | required, ≥ 0 |
| quantity | required, integer ≥ 0 (default 0) |
| reorderLevel | integer ≥ 0 (default 10) |
| supplier | optional string |
| stockValue | virtual = price × quantity |

### Error format
```json
{ "success": false, "message": "Validation failed", "errors": [{ "field": "price", "message": "Price cannot be negative" }] }
```
Status codes used: 400 (validation / bad input / insufficient stock), 404 (not found), 409 (duplicate SKU), 500.

## Design notes
- Stock changes use an atomic `findOneAndUpdate` with `$inc` and a `quantity >= requested` guard, so stock can never go negative even under concurrent requests.
- `/low-stock` and `/summary` are declared before `/:id` so they are not treated as IDs.
- Sort fields are whitelisted and user search text is regex-escaped.
- Import `docs/Inventory_API.postman_collection.json` into Postman to test everything quickly.
