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
const pollingDelay = 20000;

module.exports = {
  env: process.env.NODE_ENV || 'dev',
  port: process.env.PORT || DEFAULT_PORT,
  pdToken: process.env.PD_TOKEN,
  pdSender: process.env.PD_SENDER,
  tteToggle: process.env.TTE_TOGGLE || false,
  dev: {
    refocusUrl: process.env.REFOCUS_URL_DEV ||
      'http://localhost:3000',
    refocusRealtimeUrl: process.env.REFOCUS_REALTIME_URL_DEV,
    recommendationUrl: process.env.RECOMMENDATION_URL_DEV,
    token: process.env.API_TOKEN_DEV,
    pollingDelay: process.env.POLLING_DELAY_DEV || pollingDelay,
    useNewPDBridge: process.env.USE_NEW_PD_BRIDGE_DEV || false,
    pdBridgeUrl: process.env.PD_BRIDGE_URL_DEV || null,
    redisCacheHost: process.env.CACHE_REDIS_HOST_DEV || '127.0.0.1',
    redisCachePort: process.env.CACHE_REDIS_PORT_DEV || '6379',
    useRedisCache: process.env.USE_REDIS_CACHE_DEV === 'true' || false,
  },
  sandbox: {
    refocusUrl: process.env.REFOCUS_URL_SANDBOX,
    refocusRealtimeUrl: process.env.REFOCUS_REALTIME_URL_SANDBOX,
    recommendationUrl: process.env.RECOMMENDATION_URL_SANDBOX,
    token: process.env.API_TOKEN_SANDBOX,
    pollingDelay: process.env.POLLING_DELAY_SANDBOX || pollingDelay,
    useNewPDBridge: process.env.USE_NEW_PD_BRIDGE_SANDBOX || false,
    pdBridgeUrl: process.env.PD_BRIDGE_URL_SANDBOX || null,
    redisCacheHost: process.env.CACHE_REDIS_HOST_SANDBOX,
    redisCachePort: process.env.CACHE_REDIS_PORT_SANDBOX,
    useRedisCache: process.env.USE_REDIS_CACHE_SANDBOX === 'true' || false,
  },
  production: {
    refocusUrl: process.env.REFOCUS_URL_PROD,
    refocusRealtimeUrl: process.env.REFOCUS_REALTIME_URL_PROD,
    recommendationUrl: process.env.RECOMMENDATION_URL_PROD,
    token: process.env.API_TOKEN_PROD,
    pollingDelay: process.env.POLLING_DELAY_PROD || pollingDelay,
    useNewPDBridge: process.env.USE_NEW_PD_BRIDGE_PROD || false,
    pdBridgeUrl: process.env.PD_BRIDGE_URL_PROD || null,
    redisCacheHost: process.env.CACHE_REDIS_HOST_PROD,
    redisCachePort: process.env.CACHE_REDIS_PORT_PROD,
    useRedisCache: process.env.USE_REDIS_CACHE_PROD === 'true' || false,
  },
};

