'use strict';

const logger = require('./logger');

async function withRetry(fn, { maxRetries = 3, baseDelayMs = 500, label = '' } = {}) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      
      if (err.retryable === false) {
        throw err;
      }

      if (attempt === maxRetries) {
        logger.error(`${label} failed after ${maxRetries + 1} attempts: ${err.message}`);
        throw err;
      }

      const jitter = 0.5 + Math.random();
      const delay = Math.round(baseDelayMs * Math.pow(2, attempt) * jitter);
      logger.warn(`${label} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
}

module.exports = { withRetry };
