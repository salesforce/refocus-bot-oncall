/**
 * config.js
 * Config file for different deployments - dev, staging, production
 */

module.exports = {
  dev: {
    refocusUrl: 'http://localhost:3000',
    sfdcUsername: process.env.SFDC_USERNAME,
    sfdcPassword: process.env.SFDC_PASSWORD,
    loginUrl: process.env.SFDC_URL,
    token: process.env.API_TOKEN,
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
