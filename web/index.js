/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * /web/index.js
 *
 * This code handles intial render of the bot and any rerenders triggered
 * from javascript events.
 */

require('../web/dist/public/styles/salesforce-lightning-design-system.css');

const _ = require('lodash');
const React = require('react');
const ReactDOM = require('react-dom');
const App = require('./components/App.jsx');

const botName = require('../package.json').name;
const env = process.env.NODE_ENV || 'dev';
const config = require('../config.js')[env];
const bdk = require('@salesforce/refocus-bdk')(config);

let currentServices = {};
const ZERO = 0;
const ONE = 1;

const ROOMID = window.location.pathname.split('rooms/').length > ONE ? parseInt(window.location.pathname.split(
  'rooms/')[ONE]) : ONE; // This is a temperary fix
const roomId = parseInt(ROOMID); // ROOMID will be provided from the page DOM

document.body.addEventListener('init', init, false);
document.getElementById(botName).addEventListener('refocus.events', handleEvents, false);
document.getElementById(botName).addEventListener('refocus.room.settings', handleSettings, false);
document.getElementById(botName).addEventListener('refocus.bot.data', handleData, false);
document.getElementById(botName).addEventListener('refocus.bot.actions', handleActions, false);

/**
 * When a refocus.events is dispatch it is handled here.
 *
 * @param {Event} event - The most recent event object
 * @return null
 */
function handleEvents(event) {
  console.log(botName + ' Event Activity', event);
}

/**
 * When a refocus.room.settings is dispatch it is handled here.
 *
 * @param {Room} room - Room object that was dispatched
 * @return null
 */
function handleSettings(room) {
  console.log(botName + ' Room Activity', room);
}

/**
 * When a refocus.bot.data is dispatch it is handled here.
 *
 * @param {BotData} data - Bot Data object that was dispatched
 * @return null
 */
function handleData(data) {
  console.log(botName + ' Bot Data Activity', data);

  if (data.detail.name === 'services'){
    currentServices = JSON.parse(data.detail.value);
  }

  renderUI(currentServices, null);
}

/**
 * When a refocus.bot.actions is dispatch it is handled here.
 *
 * @param {BotAction} action - Bot Action object that was dispatched
 * @return null
 */
function handleActions(action) {
  console.log(botName + ' Bot Action Activity', action);

  if (action.detail.name === 'getServices') {
    bdk.getBotData(roomId)
      .then((data) => {
        const _services = data.body.filter(bd => bd.name === 'services')[ZERO];
        const servicesExist = _services ? true : false;

        if (!_.isEqual(currentServices, action.detail.response)) {
          currentServices = action.detail.response;

          if (servicesExist) {
            bdk.changeBotData(_services.id, JSON.stringify(currentServices));
          } else {
            bdk.createBotData(roomId, botName, 'services', JSON.stringify(currentServices));
          }
        }

        renderUI(currentServices, null);
      });
  }
}

function getServices(){
  const serviceReq = {
    'name': 'getServices',
    'botId': botName,
    roomId,
    'isPending': true,
    'parameters': []
  };

  return bdk.createBotAction(serviceReq);
}

/*
 * The actions to take before load.
 */
function init() {
  getServices();
}

/**
 * @global {Integer} roomId - Room Id that is provided from refocus
 * @return null
 */
function renderUI(services, response){
  ReactDOM.render(
    <App
      roomId={ roomId }
      services={ services }
      response={ response }
    />,
    document.getElementById(botName)
  );
}

init();
