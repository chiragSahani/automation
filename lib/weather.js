'use strict';

const axios = require('axios');
const logger = require('./logger');
const { withRetry } = require('./retry');

const BASE_URL = 'https://api.openweathermap.org/data/2.5/weather';
const REQUEST_TIMEOUT_MS = 5000;
const BATCH_SIZE = 10;
const BATCH_GAP_MS = 1000;

async function fetchWeatherForCity(city) {
  const apiKey = process.env.OPENWEATHERMAP_API_KEY;

  return withRetry(
    async () => {
      try {
        const response = await axios.get(BASE_URL, {
          params: { q: city, appid: apiKey, units: 'metric' },
          timeout: REQUEST_TIMEOUT_MS,
        });

        const data = response.data;
        return {
          city,
          main: data.weather[0].main,
          description: data.weather[0].description,
          temperature: data.main.temp,
        };
      } catch (err) {
        if (err.response) {
          const status = err.response.status;

          
          if (status === 404) {
            const error = new Error(`City not found: "${city}"`);
            error.retryable = false;
            throw error;
          }

       
          if (status === 401) {
            const error = new Error('Invalid OpenWeatherMap API key. Check your .env file.');
            error.retryable = false;
            throw error;
          }
        }

      
        throw err;
      }
    },
    { maxRetries: 3, baseDelayMs: 500, label: `Weather fetch for "${city}"` }
  );
}
async function fetchWeatherForCities(cities) {
  const weatherMap = new Map();

  for (let i = 0; i < cities.length; i += BATCH_SIZE) {
    const batch = cities.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((city) => fetchWeatherForCity(city))
    );

    results.forEach((result, index) => {
      const city = batch[index];
      if (result.status === 'fulfilled') {
        weatherMap.set(city, result.value);
      } else {
        logger.warn(`Failed to fetch weather for "${city}": ${result.reason.message}`);
        weatherMap.set(city, null);
      }
    });

    
    const hasMoreBatches = i + BATCH_SIZE < cities.length;
    if (hasMoreBatches) {
      await new Promise((resolve) => setTimeout(resolve, BATCH_GAP_MS));
    }
  }

  return weatherMap;
}

module.exports = { fetchWeatherForCity, fetchWeatherForCities };
