'use strict';

const DELAY_CONDITIONS = new Set(['Rain', 'Drizzle', 'Thunderstorm', 'Snow', 'Extreme']);

function generateApologyMessage(customer, city, condition) {
  const firstName = customer.split(' ')[0];
  return (
    `Hi ${firstName}, your order to ${city} is delayed due to ${condition.toLowerCase()} conditions. ` +
    `We appreciate your patience and will update you once it's on its way!`
  );
}


function determineDeliveryStatus(order, weatherData) {
  const enriched = { ...order, processed_at: new Date().toISOString() };

  
  if (!weatherData) {
    enriched.weather = 'unavailable';
    return enriched;
  }

  enriched.weather = {
    main: weatherData.main,
    description: weatherData.description,
    temperature: weatherData.temperature,
  };

  if (DELAY_CONDITIONS.has(weatherData.main)) {
    enriched.status = 'Delayed';
    enriched.delay_reason = weatherData.main;
    enriched.apology_message = generateApologyMessage(
      order.customer,
      order.city,
      weatherData.main
    );
  }

  return enriched;
}

module.exports = { determineDeliveryStatus, generateApologyMessage, DELAY_CONDITIONS };
