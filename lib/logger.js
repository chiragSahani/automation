'use strict';

function formatMessage(level, message) {
  const timestamp = new Date().toISOString();
  return `[${timestamp}] [${level}] ${message}`;
}

function info(message) {
  console.log(formatMessage('INFO', message));
}

function warn(message) {
  console.warn(formatMessage('WARN', message));
}

function error(message) {
  console.error(formatMessage('ERROR', message));
}

module.exports = { info, warn, error };
