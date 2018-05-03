/* eslint no-process-env: 0 */
/**
 * config.js
 * Config file for different deployments - dev, staging, production
 */

const DEFAULT_PORT = 5000;

module.exports = {
  env: process.env.NODE_ENV || 'dev',
  port: process.env.PORT || DEFAULT_PORT,
  dev: {
    refocusUrl: 'http://localhost:3000',
    sfdcUsername: process.env.SFDC_USERNAME,
    sfdcPassword: process.env.SFDC_PASSWORD,
    loginUrl: process.env.SFDC_URL,
    token: process.env.API_TOKEN,
    httpProxy: false,
    socketToken: process.env.SOCKET_TOKEN,
    pdToken: process.env.PD_TOKEN,
    pdSender: process.env.PD_SENDER,
  },
  staging: {
    refocusUrl: 'http://refocus-staging.herokuapp.com',
    sfdcUsername: process.env.SFDC_USERNAME,
    sfdcPassword: process.env.SFDC_PASSWORD,
    loginUrl: process.env.SFDC_URL,
    token: process.env.API_TOKEN,
    httpProxy: false,
    socketToken: process.env.SOCKET_TOKEN,
    pdToken: process.env.PD_TOKEN,
    pdSender: process.env.PD_SENDER,
  },
  sandbox: {
    refocusUrl: 'https://refocus-sandbox.hk.salesforce.com',
    sfdcUsername: process.env.SFDC_USERNAME,
    sfdcPassword: process.env.SFDC_PASSWORD,
    loginUrl: process.env.SFDC_URL,
    token: process.env.API_TOKEN,
    socketToken: process.env.SOCKET_TOKEN,
    pdToken: process.env.PD_TOKEN,
    pdSender: process.env.PD_SENDER,
  },
  productionNoUglify: {
    refocusUrl: 'https://refocus.hk.salesforce.com',
    sfdcUsername: process.env.SFDC_USERNAME,
    sfdcPassword: process.env.SFDC_PASSWORD,
    loginUrl: process.env.SFDC_URL,
    token: process.env.API_TOKEN,
    socketToken: process.env.SOCKET_TOKEN,
    pdToken: process.env.PD_TOKEN,
    pdSender: process.env.PD_SENDER,
  },
  production: {
    refocusUrl: 'https://refocus.hk.salesforce.com',
    sfdcUsername: process.env.SFDC_USERNAME,
    sfdcPassword: process.env.SFDC_PASSWORD,
    loginUrl: process.env.SFDC_URL,
    token: process.env.API_TOKEN,
    socketToken: process.env.SOCKET_TOKEN,
    pdToken: process.env.PD_TOKEN,
    pdSender: process.env.PD_SENDER,
  },
};

