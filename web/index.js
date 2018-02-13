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

const _ = require('lodash');
const handlebars=require('handlebars');
const React = require('react');
const ReactDOM = require('react-dom');
const App = require('./components/App.jsx');

const botName = require('../package.json').name;
const env = process.env.NODE_ENV || 'dev';
const config = require('../config.js')[env];
const bdk = require('@salesforce/refocus-bdk')(config);

let currentServices = {};
let currentVariables = {};
let currentTemplate = '';
let currentMessage = '';
let _incidentLogs = {};

const defaultVariables = {};
const defaultTemplate = 'Join incident room: {{imcLink}}';

const ZERO = 0;

const roomId = bdk.getRoomId();

/**
 * When a refocus.events is dispatch it is handled here.
 *
 * @param {Event} event - The most recent event object
 */
function handleEvents(event) {
  console.log(botName + ' Event Activity', event);
}

/**
 * When a refocus.room.settings is dispatch it is handled here.
 *
 * @param {Room} room - Room object that was dispatched
 */
function handleSettings(room) {
  console.log(botName + ' Room Activity', room);
}

/**
 * When a refocus.bot.data is dispatch it is handled here.
 *
 * @param {BotData} data - Bot Data object that was dispatched
 */
function handleData(data) {
  console.log(botName + ' Bot Data Activity', data);

  if (data.detail.name === 'onCallBotServices'){
    currentServices = JSON.parse(data.detail.value);
  }

  if (data.detail.name === 'onCallIncidents'){
    _incidentLogs = JSON.parse(data.detail.value);
  }

  const incidents = _incidentLogs ?
    JSON.parse(_incidentLogs.value).incidents :
    [];

  renderUI(currentServices, currentMessage, null, incidents);
}

/**
 * When a refocus.bot.actions is dispatch it is handled here.
 *
 * @param {BotAction} action - Bot Action object that was dispatched
 */
function handleActions(action) {
  console.log(botName + ' Bot Action Activity', action);

  if (action.detail.name === 'getServices') {
    bdk.getBotData(roomId)
      .then((data) => {
        const _services = data.body
          .filter((bd) => bd.name === 'onCallBotServices')[ZERO];

        if (!_.isEqual(currentServices, action.detail.response)) {
          currentServices = action.detail.response;

          if (_services) {
            bdk.changeBotData(_services.id, JSON.stringify(currentServices));
          } else {
            bdk.createBotData(
              roomId,
              botName,
              'onCallBotServices',
              JSON.stringify(currentServices)
            );
          }
        }
        const incidents = _incidentLogs ?
          JSON.parse(_incidentLogs.value).incidents :
          [];
        renderUI(currentServices, currentMessage, null, incidents);
      });
  } else {
    const newIncidents = _incidentLogs ?
      JSON.parse(_incidentLogs.value) :
      { incidents: [] };
    newIncidents.incidents =
      newIncidents.incidents.concat(action.detail.response.incidents);
    if (_incidentLogs) {
      bdk.changeBotData(_incidentLogs.id, JSON.stringify(newIncidents))
        .then((o) => {
          _incidentLogs = o.body;
        });
    } else {
      bdk.createBotData(
        roomId,
        botName,
        'onCallIncidents',
        JSON.stringify(action.detail.response)
      ).then((o) => {
        _incidentLogs = o.body;
      });
    }

    renderUI(
      currentServices,
      currentMessage,
      action.detail.response,
      newIncidents.incidents
    );
  }
}

/**
 * Create botAction to get all the services
 *
 * @returns {Promise} - Bot Action Promise
 */
function getServices() {
  const serviceReq = {
    'name': 'getServices',
    'botId': botName,
    roomId,
    'isPending': true,
    'parameters': []
  };

  return bdk.createBotAction(serviceReq);
}

/**
 * The actions to take before load.
 */
function init() {
  bdk.getBotData(roomId)
    .then((data) => {
      const _services = data.body
        .filter((bd) => bd.name === 'onCallBotServices')[ZERO];
      const _template = data.body
        .filter((bd) => bd.name === 'onCallBotTemplate')[ZERO];
      const _variables = data.body
        .filter((bd) => bd.name === 'onCallBotData')[ZERO];
      _incidentLogs = data.body
        .filter((bd) => bd.name === 'onCallIncidents')[ZERO];
      currentServices = _services ? JSON.parse(_services.value) : {};
      currentVariables = _variables ?
        JSON.parse(_variables.value) : defaultVariables;
      currentTemplate = _template ? _template.value : defaultTemplate;

      if (!_services || !_template || !_variables) {
        bdk.findRoom(roomId)
          .then((res) => {
            if (!_services) {
              if (res.body.settings) {
                if (res.body.settings.onCallBotServices) {
                  currentServices = res.body.settings.onCallBotServices;
                }
              }

              bdk.createBotData(
                roomId,
                botName,
                'onCallBotServices',
                JSON.stringify(currentServices)
              );
            }

            if (!_template) {
              if (res.body.settings) {
                if (res.body.settings.onCallBotTemplate) {
                  currentTemplate = res.body.settings.onCallBotTemplate;
                }
              }

              bdk.createBotData(
                roomId,
                botName,
                'onCallBotTemplate',
                JSON.stringify(currentTemplate)
              );
            }

            if (!_variables) {
              if (res.body.settings) {
                if (res.body.settings.onCallBotData) {
                  currentVariables = res.body.settings.onCallBotData;
                }
              }

              bdk.createBotData(
                roomId,
                botName,
                'onCallBotData',
                JSON.stringify(currentVariables)
              );
            }
          });
      }

      currentVariables.imcLink = window.location.href;
      const incidents = _incidentLogs ?
        JSON.parse(_incidentLogs.value).incidents :
        [];
      const selTemplate=handlebars.compile(currentTemplate);
      const unparsedTemp=selTemplate(currentVariables);
      currentMessage = unparsedTemp.toString();
      renderUI(currentServices, currentMessage, null, incidents);
    });

  getServices();
}

/**
 * global {Integer} roomId - Room Id that is provided from refocus
 * @param {Object} services - Services Selected
 * @param {String} message - Message Response
 * @param {Object} response - Action Response
 * @param {Array} incidentList - List of incidents
 */
function renderUI(services, message, response, incidentList){
  ReactDOM.render(
    <App
      roomId={ roomId }
      services={ services }
      message = { message }
      response={ response }
      incidents={ incidentList }
    />,
    document.getElementById(botName)
  );
}

document.getElementById(botName)
  .addEventListener('refocus.events', handleEvents, false);
document.getElementById(botName)
  .addEventListener('refocus.room.settings', handleSettings, false);
document.getElementById(botName)
  .addEventListener('refocus.bot.data', handleData, false);
document.getElementById(botName)
  .addEventListener('refocus.bot.actions', handleActions, false);
init();
