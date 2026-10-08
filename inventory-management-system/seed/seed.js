// Usage: npm run seed            -> wipe & insert 12 sample products
//        npm run seed:destroy    -> wipe only
require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../src/models/Product');

const products = [
  { name: 'Wireless Mouse', sku: 'ELEC-MS-101', category: 'Electronics', price: 799, quantity: 30, reorderLevel: 10, supplier: 'Logitech' },
  { name: 'Mechanical Keyboard', sku: 'ELEC-KB-102', category: 'Electronics', price: 4599, quantity: 6, reorderLevel: 8, supplier: 'Keychron' },
  { name: 'Bluetooth Speaker', sku: 'ELEC-SP-103', category: 'Electronics', price: 2999, quantity: 40, reorderLevel: 12, supplier: 'JBL' },
  { name: 'Laptop 15 inch', sku: 'ELEC-LP-104', category: 'Electronics', price: 14999, quantity: 20, reorderLevel: 5, supplier: 'Lenovo' },
  { name: 'Cotton T-Shirt', sku: 'APRL-TS-201', category: 'Apparel', price: 499, quantity: 50, reorderLevel: 15, supplier: 'H&M' },
  { name: 'Denim Jacket', sku: 'APRL-JK-202', category: 'Apparel', price: 2299, quantity: 28, reorderLevel: 8, supplier: 'Levis' },
  { name: 'Study Table', sku: 'FURN-TB-812', category: 'Furniture', price: 3999, quantity: 2, reorderLevel: 4, supplier: 'IKEA India' },
  { name: 'Office Chair', sku: 'FURN-CH-813', category: 'Furniture', price: 5499, quantity: 3, reorderLevel: 5, supplier: 'Godrej Interio' },
  { name: 'Gel Pen Pack of 15', sku: 'STNY-PN-713', category: 'Stationery', price: 120, quantity: 40, reorderLevel: 20, supplier: 'Cello Pens' },
  { name: 'A4 Notebook', sku: 'STNY-NB-714', category: 'Stationery', price: 85, quantity: 15, reorderLevel: 25, supplier: 'Classmate' },
  { name: 'Basmati Rice 5kg', sku: 'GROC-RC-301', category: 'Groceries', price: 650, quantity: 60, reorderLevel: 20, supplier: 'India Gate' },
  { name: 'Olive Oil 1L', sku: 'GROC-OL-302', category: 'Groceries', price: 899, quantity: 18, reorderLevel: 10, supplier: 'Figaro' },
];

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    await Product.deleteMany();
    console.log('Existing products removed');
    if (!process.argv.includes('--destroy')) {
      await Product.insertMany(products);
      console.log(`${products.length} products inserted`);
    }
  } catch (err) {
    console.error('Seeding failed:', err.message);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
})();
