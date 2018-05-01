/**
 * config.js
 * Config file for different deployments - dev, staging, production
 */

module.exports = {
  dev: {
    refocusUrl: process.env.REFOCUS_URL ||
        'http://localhost:3000',
    sfdcUsername: process.env.SFDC_USERNAME,
    sfdcPassword: process.env.SFDC_PASSWORD,
    loginUrl: process.env.SFDC_URL,
    token: process.env.API_TOKEN,
    socketToken: process.env.SOCKET_TOKEN,
    pdToken: process.env.PD_TOKEN,
    pdSender: process.env.PD_SENDER,
  },
  staging: {
    refocusUrl: process.env.REFOCUS_URL ||
        'http://refocus-staging.internal.salesforce.com',
    sfdcUsername: process.env.SFDC_USERNAME,
    sfdcPassword: process.env.SFDC_PASSWORD,
    loginUrl: process.env.SFDC_URL,
    token: process.env.API_TOKEN,
    socketToken: process.env.SOCKET_TOKEN,
    pdToken: process.env.PD_TOKEN,
    pdSender: process.env.PD_SENDER,
  },
  sandbox: {
    refocusUrl: process.env.REFOCUS_URL ||
        'https://refocus.hk.salesforce.com',
    sfdcUsername: process.env.SFDC_USERNAME,
    sfdcPassword: process.env.SFDC_PASSWORD,
    loginUrl: process.env.SFDC_URL,
    token: process.env.API_TOKEN,
    socketToken: process.env.SOCKET_TOKEN,
    pdToken: process.env.PD_TOKEN,
    pdSender: process.env.PD_SENDER,
  },
  production: {
    refocusUrl: process.env.REFOCUS_URL ||
        'https://refocus.hk.salesforce.com',
    sfdcUsername: process.env.SFDC_USERNAME,
    sfdcPassword: process.env.SFDC_PASSWORD,
    loginUrl: process.env.SFDC_URL,
    token: process.env.API_TOKEN,
    socketToken: process.env.SOCKET_TOKEN,
    pdToken: process.env.PD_TOKEN,
    pdSender: process.env.PD_SENDER,
  },
};
