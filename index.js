'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const logger = require('./lib/logger');
const { validateOrders } = require('./lib/validator');
const { fetchWeatherForCities } = require('./lib/weather');
const { determineDeliveryStatus } = require('./lib/delivery');

const ORDERS_FILE = path.join(__dirname, 'orders.json');

/**
 * Main orchestrator — reads orders, enriches with weather data, writes results.
 */
async function main() {
  // 1. Validate API key
  if (!process.env.OPENWEATHERMAP_API_KEY || process.env.OPENWEATHERMAP_API_KEY === 'your_key_here') {
    logger.error('Missing or placeholder OPENWEATHERMAP_API_KEY in .env file.');
    process.exit(1);
  }

  // 2. Read orders file
  let rawData;
  try {
    rawData = fs.readFileSync(ORDERS_FILE, 'utf-8');
  } catch (err) {
    logger.error(`Failed to read ${ORDERS_FILE}: ${err.message}`);
    process.exit(1);
  }

  // 3. Parse JSON
  let orders;
  try {
    orders = JSON.parse(rawData);
  } catch (err) {
    logger.error(`Invalid JSON in ${ORDERS_FILE}: ${err.message}`);
    process.exit(1);
  }

  // 4. Validate structure
  const validation = validateOrders(orders);
  if (!validation.valid) {
    logger.error('Order validation failed:');
    validation.errors.forEach((e) => logger.error(`  - ${e}`));
    process.exit(1);
  }

  logger.info(`Loaded ${orders.length} orders from ${ORDERS_FILE}`);

  // 5. Extract unique cities
  const uniqueCities = [...new Set(orders.map((o) => o.city).filter(Boolean))];
  logger.info(`Fetching weather for ${uniqueCities.length} unique cities: ${uniqueCities.join(', ')}`);

  // 6. Fetch weather concurrently
  const weatherMap = await fetchWeatherForCities(uniqueCities);

  // 7. Enrich orders with weather-aware delivery logic
  let delayedCount = 0;
  let unavailableCount = 0;

  const enrichedOrders = orders.map((order) => {
    const weather = weatherMap.get(order.city) || null;
    const enriched = determineDeliveryStatus(order, weather);

    if (enriched.status === 'Delayed') delayedCount++;
    if (enriched.weather === 'unavailable') unavailableCount++;

    return enriched;
  });

  // 8. Write updated orders back to file
  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(enrichedOrders, null, 2) + '\n', 'utf-8');
    logger.info(`Updated ${ORDERS_FILE} successfully.`);
  } catch (err) {
    logger.error(`Failed to write ${ORDERS_FILE}: ${err.message}`);
    process.exit(1);
  }

  // 9. Summary
  const onTimeCount = orders.length - delayedCount - unavailableCount;
  logger.info(
    `Processing complete: ${orders.length} orders — ` +
    `${delayedCount} delayed, ${onTimeCount} on-time, ${unavailableCount} weather unavailable.`
  );

  // 10. Print delayed order messages
  enrichedOrders
    .filter((o) => o.apology_message)
    .forEach((o) => {
      logger.info(`[${o.order_id}] ${o.apology_message}`);
    });
}

main().catch((err) => {
  logger.error(`Unexpected error: ${err.message}`);
  process.exit(1);
});
