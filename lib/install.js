'use strict';

/**
 * /lib/install.js
 * A library that installs or updates a Bot
 */
const request = require('superagent');

const env = process.env.NODE_ENV || 'dev';
const { refocusUrl, token } = require('./../config.js')[env];
const { name, url } = require('./../package.json');
const { metadata: { actions, data, settings } } = require('./../package.json');
const ui = 'web/dist/bot.zip';

/**
 * Installs a new Bot.
 * Executes a POST request against Refocus /v1/bots route
 *
 */
function installBot(bot) {

  const {
    name,
    url,
    ui,
    active = false,
    actions = [],
    data = [],
    settings = []
  } = bot;

  return new Promise((resolve, reject) => {
    request
      .post(`${refocusUrl}/v1/bots`)
      .set('Content-Type', 'multipart/form-data')
      .set('Authorization', token)
      .field('name', name)
      .field('url', url)
      .field('active', active)
      .field('actions', JSON.stringify(actions))
      .field('data', JSON.stringify(data))
      .field('settings', JSON.stringify(settings))
      .attach('ui', ui)
      .set('Accept', 'application/json')
      .end((err, res) => {
        if (!res) {
          console.log('Failed to install a bot. Check if Refocus server is running');
          return;
        }
        const ok = (res.status === 200) || (res.status === 201);
        if (err || !ok) {
          const [ errorMessage ] = res.body.errors;
          if (errorMessage) {
            if (errorMessage.message === 'name must be unique') {
              reject('duplicate');
            }
          }
          reject(err || !ok);
        } else {
          //Need to save this after install
          console.log('Socket Authorization Token: ' + res.body.token);
          resolve(res);
        }
      });
  });
}  // installBot

/**
 * Updates existing Bot.
 * Executes a PUT request against Refocus /v1/bots route
 *
 */
function updateBot(bot) {

  const {
    name,
    url,
    ui,
    active = false,
    actions = [],
    data = [],
    settings = []
  } = bot;

  return new Promise((resolve, reject) => {
    request
      .put(`${refocusUrl}/v1/bots/${name}`)
      .set('Content-Type', 'multipart/form-data')
      .set('Authorization', token)
      .field('name', name)
      .field('url', url)
      .field('active', active)
      .field('actions', JSON.stringify(actions))
      .field('data', JSON.stringify(data))
      .field('settings', JSON.stringify(settings))
      .attach('ui', ui)
      .set('Accept', 'application/json')
      .end((err, res) => {
        if (!res) {
          console.log('Failed to update a bot. Check if Refocus server is running');
          reject();
        }
        else {
          const ok = (res.status === 200) || (res.status === 201);
          if (err || !ok) {
            console.log(`error: ${err} res: ${res}`);
            const [ errorMessage ] = res.body.errors;
            if (errorMessage) {
              if (errorMessage.type === 'SequelizeValidationError') {
                reject('validation error');
              }
            }
            reject(err || !ok);
          } else {
            resolve(res);
          }
        }
      });
  });
} // updateBot

// execute installation only when called directly
// via npm run install-bot (skips require statements)
if (require.main === module) {

  const bot = { name, url, actions, data, settings, ui, active: true };

  // try to update a bot
  // this function is more common then installing a new bot
  // therefore executed first
  updateBot(bot)
  .then(res => {
    console.log(`bot ${name} successfully updated on: ${refocusUrl}`);
    process.exit();
  })
  .catch(error => {
    // err not found indicate that bot doesnt exist yet
    if (error.status == 404) {
      // installs a new bot in refocus
      installBot(bot)
      .then(res => {
        console.log(`bot ${name} successfully installed on: ${refocusUrl}`);
        process.exit();
      })
      .catch(error => {
        console.log(`unable to install bot ${name} on: ${refocusUrl}`);
        console.log(`Details: ${JSON.stringify(error)}`);
        process.exit(1);
      });
    }
    else {
      console.log(`Something went wrong while updating ${name} on: ${refocusUrl}`);
      console.log(`Details: ${JSON.stringify(error)}`);
      process.exit(1);
    }
  });
}

module.exports = { installBot, updateBot };