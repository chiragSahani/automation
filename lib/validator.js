'use strict';

function validateOrders(data) {
  const errors = [];

  if (!Array.isArray(data)) {
    return { valid: false, errors: ['Orders data must be an array.'] };
  }

  if (data.length === 0) {
    return { valid: false, errors: ['Orders array is empty.'] };
  }

  data.forEach((order, index) => {
    const prefix = `Order at index ${index}`;

    if (typeof order !== 'object' || order === null) {
      errors.push(`${prefix}: must be an object.`);
      return;
    }

    if (!order.order_id && order.order_id !== 0) {
      errors.push(`${prefix}: missing "order_id".`);
    }

    if (typeof order.customer !== 'string' || !order.customer.trim()) {
      errors.push(`${prefix}: "customer" must be a non-empty string.`);
    }

    if (typeof order.city !== 'string' || !order.city.trim()) {
      errors.push(`${prefix}: "city" must be a non-empty string.`);
    }

    if (typeof order.status !== 'string' || !order.status.trim()) {
      errors.push(`${prefix}: "status" must be a non-empty string.`);
    }
  });

  return { valid: errors.length === 0, errors };
}

module.exports = { validateOrders };
