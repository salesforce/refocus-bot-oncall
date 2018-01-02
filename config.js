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
    host: 'localhost',
    port: '3000',
    token: process.env.API_TOKEN,
  },
  staging: {
    refocusUrl: 'http://refocus-staging.herokuapp.com',
    sfdcUsername: process.env.SFDC_USERNAME,
    sfdcPassword: process.env.SFDC_PASSWORD,
    loginUrl: process.env.SFDC_URL,
    host: 'refocus-staging.herokuapp.com',
    port: '',
    token: process.env.API_TOKEN,
  },
  sandbox: {
    refocusUrl: 'https://refocus-sandbox.hk.salesforce.com',
    sfdcUsername: process.env.SFDC_USERNAME,
    sfdcPassword: process.env.SFDC_PASSWORD,
    loginUrl: process.env.SFDC_URL,
    host: 'refocus-sandbox.hk.salesforce.com',
    port: '',
    token: process.env.API_TOKEN,
  },
  production: {
    refocusUrl: 'https://refocus.hk.salesforce.com',
    sfdcUsername: process.env.SFDC_USERNAME,
    sfdcPassword: process.env.SFDC_PASSWORD,
    loginUrl: process.env.SFDC_URL,
    host: 'refocus.hk.salesforce.com',
    port: '',
    token: process.env.API_TOKEN,
  },
};
