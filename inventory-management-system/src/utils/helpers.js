const AppError = require('./AppError');

// Escape user input before using it inside a RegExp
const escapeRegex = (str) => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Parse a query value into a finite number or throw 400
const toNumber = (value, name) => {
  const n = Number(value);
  if (value === '' || !Number.isFinite(n)) {
    throw new AppError(`Query parameter '${name}' must be a valid number`, 400);
  }
  return n;
};

// Keep only allowed keys from an object
const pick = (obj = {}, keys = []) =>
  keys.reduce((acc, key) => {
    if (obj[key] !== undefined) acc[key] = obj[key];
    return acc;
  }, {});

module.exports = { escapeRegex, toNumber, pick };
