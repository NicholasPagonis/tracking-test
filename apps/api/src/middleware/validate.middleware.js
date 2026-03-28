'use strict';

/**
 * Lightweight validation middleware factory.
 * Accepts a validate function that throws { status, message } on failure.
 * Usage: router.get('/path', validate(myValidator), controller)
 */
function validate(validatorFn) {
  return (req, res, next) => {
    try {
      validatorFn(req);
      next();
    } catch (err) {
      res.status(err.status || 400).json({ error: err.message || 'Validation error' });
    }
  };
}

/** Parse a float from a string or number, throws if invalid. */
function requireFloat(value, fieldName) {
  const n = parseFloat(value);
  if (isNaN(n)) {
    const err = new Error(`${fieldName} must be a valid number`);
    err.status = 400;
    throw err;
  }
  return n;
}

/** Parse an ISO timestamp string, returns Date or throws. */
function requireTimestamp(value, fieldName) {
  if (!value) {
    const err = new Error(`${fieldName} is required`);
    err.status = 400;
    throw err;
  }
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    const err = new Error(`${fieldName} must be a valid ISO timestamp`);
    err.status = 400;
    throw err;
  }
  return d.toISOString();
}

module.exports = { validate, requireFloat, requireTimestamp };
