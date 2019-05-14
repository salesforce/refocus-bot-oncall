/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/* eslint no-process-env: 0 */
/**
 * config.js
 * Config file for different deployments - dev, staging, production
 */
const DEFAULT_PORT = 5000;

module.exports = {
  env: process.env.NODE_ENV || 'dev',
  port: process.env.PORT || DEFAULT_PORT,
  pdToken: process.env.PD_TOKEN,
  pdSender: process.env.PD_SENDER,
  dev: {
    refocusUrl: process.env.REFOCUS_URL_DEV ||
      'http://localhost:3000',
    refocusRealtimeUrl: process.env.REFOCUS_REALTIME_URL_DEV,
    token: process.env.API_TOKEN_DEV,
  },
  perf: {
    refocusUrl: process.env.REFOCUS_URL_PERF,
    refocusRealtimeUrl: process.env.REFOCUS_REALTIME_URL,
    token: process.env.API_TOKEN_PERF,
  },
  sandbox: {
    refocusUrl: process.env.REFOCUS_URL_SANDBOX,
    refocusRealtimeUrl: process.env.REFOCUS_REALTIME_URL_SANDBOX,
    token: process.env.API_TOKEN_SANDBOX,
  },
  production: {
    refocusUrl: process.env.REFOCUS_URL_PROD,
    refocusRealtimeUrl: process.env.REFOCUS_REALTIME_URL_PERF,
    token: process.env.API_TOKEN_PERF,
  },
};

