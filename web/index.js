/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
/**
 * /web/index.js
 *
 * This code handles initial render of the bot and any re-renders triggered
 * from javascript events.
 */

import App from './components/App.jsx';
import isEqual from 'lodash/isEqual';
import isEmpty from 'lodash/isEmpty';
import { compile } from 'handlebars';
import React from 'react';
import ReactDOM from 'react-dom';
const serialize = require('serialize-javascript');

const botName = require('../package.json').name;
const env = require('../config.js').env;
const config = require('../config.js')[env];
const bdk = require('@salesforce/refocus-bdk')(config, botName);

let currentServices = {};
let currentVariables = {};
let currentTemplate = '';
let currentMessage = '';
let _incidentLogs = {};
let currentRecommendations = [];


const defaultVariables = {};
const defaultTemplate = 'Join incident room: {{imcLink}}';

const ZERO = 0;

const roomId = bdk.getRoomId();

/* eslint-disable func-style */

/**
 * global {Integer} roomId - Room Id that is provided from refocus
 * @param {Object} services - Services Selected
 * @param {String} message - Message Response
 * @param {Object} response - Action Response
 * @param {Array} incidentList - List of incidents
 */
function renderUI(services, message, response, incidentList) {
  const recommendations = currentRecommendations.map(({ label, value }) => {
    return { label, value };
  });
  ReactDOM.render(
    <App
      roomId={roomId}
      services={services}
      message={message}
      response={response}
      incidents={incidentList}
      recommendations={recommendations}
    />,
    document.getElementById(botName)
  );
}

/**
 * When a refocus.events is dispatch it is handled here.
 *
 * @param {Event} event - The most recent event object
 */
function handleEvents(event) {
  bdk.log.debug(botName + ' Event Activity', event);
}

/**
 * When a refocus.room.settings is dispatch it is handled here.
 *
 * @param {Room} room - Room object that was dispatched
 */
function handleSettings(room) {
  bdk.log.debug(botName + ' Room Activity', room);
}

/**
 * Create botAction to get Recommendations
 *
 * @returns {Promise} - Bot Action Promise
 */
function createActionToGetRecommendations() {
  const serviceReq = {
    'name': 'getRecommendations',
    'botId': botName,
    roomId,
    'isPending': true,
    'parameters': [
      {
        'name': 'caseData',
        'value': serialize(currentVariables),
      },
    ]
  };

  return bdk.createBotAction(serviceReq);
}

const handleDataActionDispatcher = {
  'onCallBotServices': (data) => {
    currentServices = JSON.parse(data.detail.value);
    createActionToGetRecommendations();
  },
  'onCallIncidents': (data) => {
    _incidentLogs = JSON.parse(data.detail.value);
  },
  'onCallBotData': (data) => {
    currentVariables = JSON.parse(data.detail.value);
    const selTemplate = compile(currentTemplate);
    currentMessage = selTemplate(currentVariables).toString();
  },
  'onCallBotTemplate': (data) => {
    currentTemplate = JSON.parse(data.detail.value);
    const selTemplate = compile(currentTemplate);
    currentMessage = selTemplate(currentVariables).toString();
  }
};

/**
 * When a refocus.bot.data is dispatch it is handled here.
 *
 * @param {Object} data - Bot Data object that was dispatched
 */
function handleData(data) {
  bdk.log.debug('Bot Data Event Received: ', data.detail);

  const handleDataAction = handleDataActionDispatcher[data.detail.name];
  if (handleDataAction) {
    handleDataAction(data);
  }

  const incidents = _incidentLogs && _incidentLogs.value ?
    JSON.parse(_incidentLogs.value).incidents : [];
  renderUI(currentServices, currentMessage, null, incidents);
}

/**
 * @param {Object} botAction - Bot Action object that was dispatched
 */
const getServicesAction = (botAction) => {
  bdk.getBotData(roomId, botName)
    .then((data) => {
      const _services = data.body
        .filter((bd) => bd.name === 'onCallBotServices')[ZERO];
      if (!isEqual(currentServices, botAction.detail.response)) {
        currentServices = botAction.detail.response;
        if (_services) {
          bdk.changeBotData(_services.id, serialize(currentServices));
        } else {
          bdk.createBotData(
            roomId,
            botName,
            'onCallBotServices',
            serialize(currentServices)
          );
        }
      }
      const incidents = _incidentLogs ?
        JSON.parse(_incidentLogs.value).incidents :
        [];
      renderUI(currentServices, currentMessage, null, incidents);
    });
};

/**
 * @param {Object} botAction - Bot Action object that was dispatched
 */
const getRecommendationsAction = (botAction) => {
  if (!botAction.detail.response.recommendations) return;
  const recommendedServices =
  botAction.detail.response.recommendations
    .filter((recommendation) => currentServices[recommendation])
    .map((recommendation) => {
      return {
        label: recommendation,
        value: currentServices[recommendation]
      };
    });

  if (!isEqual(currentRecommendations, recommendedServices)) {
    currentRecommendations = recommendedServices;
    bdk.upsertBotData(roomId, botName, 'onCallRecommendations',
      serialize(currentRecommendations));
  }
  const incidents = _incidentLogs ?
    JSON.parse(_incidentLogs.value).incidents :
    [];
  renderUI(currentServices, currentMessage, null, incidents);
};

/**
 * @param {Object} botAction - Bot Action object that was dispatched
 * @returns {Object} incidents
 */
function refreshIncidents(botAction) {
  const newIncidents = _incidentLogs ?
    JSON.parse(_incidentLogs.value) :
    { incidents: [] };
  newIncidents.incidents =
    newIncidents.incidents.concat(botAction.detail.response.incidents);

  if (_incidentLogs) {
    bdk.changeBotData(_incidentLogs.id, serialize(newIncidents))
      .then((o) => {
        _incidentLogs = o.body;
      });
  } else {
    bdk.createBotData(
      roomId,
      botName,
      'onCallIncidents',
      serialize(botAction.detail.response)
    ).then((o) => {
      _incidentLogs = o.body;
    });
  }
  return newIncidents;
}

const handleActionDispatcher = {
  'getServices': getServicesAction,
  'getRecommendations': getRecommendationsAction,
};

/**
 * When a refocus.bot.actions is dispatch it is handled here.
 *
 * @param {Object} botAction - Bot Action object that was dispatched
 */
function handleActions(botAction) {
  bdk.log.debug(botName + ' Bot Action Activity', botAction);
  if (botAction.detail.userId === bdk.getUserId()) {
    const handleAction = handleActionDispatcher[botAction.detail.name];
    if (handleAction) {
      handleAction(botAction);
    } else {
      const newIncidents = refreshIncidents(botAction);
      renderUI(currentServices, currentMessage, botAction.detail.response,
        newIncidents.incidents);
    }
  }
}

/**
 * Create botAction to get all the services
 *
 * @returns {Promise} - Bot Action Promise
 */
function createActionToGetServices() {
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
 * @param {String} name
 * @param {Object} object
 */
function createBotData(name, object) {
  bdk.createBotData(roomId, botName, name, serialize(object));
}

/**
 * The actions to take before load.
 */
function init() {
  bdk.getBotData(roomId, botName)
    .then((data) => {
      const _services = data.body
        .filter((bd) => bd.name === 'onCallBotServices')[ZERO];
      const _template = data.body
        .filter((bd) => bd.name === 'onCallBotTemplate')[ZERO];
      const _variables = data.body
        .filter((bd) => bd.name === 'onCallBotData')[ZERO];
      _incidentLogs = data.body
        .filter((bd) => bd.name === 'onCallIncidents')[ZERO];
      const _recommendations = data.body
        .filter((bd) => bd.name === 'onCallRecommendations')[ZERO];
      currentServices = _services ? JSON.parse(_services.value) : {};
      currentVariables = _variables ?
        JSON.parse(_variables.value) : defaultVariables;
      currentTemplate = _template ? _template.value : defaultTemplate;
      currentRecommendations = _recommendations ?
        JSON.parse(_recommendations.value) : [];
      if (!_services || isEmpty(currentServices) || !_template||
       !_variables|| !_recommendations) {
        bdk.findRoom(roomId)
          .then((res) => {
            if (!_services || isEmpty(currentServices)) {
              if (res.body.settings && res.body.settings.onCallBotServices) {
                currentServices = res.body.settings.onCallBotServices;
              }
              createBotData('onCallBotServices', currentServices);
              createActionToGetServices();
            }

            if (!_template) {
              if (res.body.settings && res.body.settings.onCallBotTemplate) {
                currentTemplate = res.body.settings.onCallBotTemplate;
              }
              createBotData('onCallBotTemplate', currentTemplate);
            }

            if (!_variables) {
              if (res.body.settings && res.body.settings.onCallBotData) {
                currentVariables = res.body.settings.onCallBotData;
              }
              createBotData('onCallBotData', currentVariables);
            }

            if (!_recommendations) {
              createBotData('onCallRecommendations', []);
            }
          });
      }

      currentVariables.imcLink = window.location.href;
      const incidents = _incidentLogs ?
        JSON.parse(_incidentLogs.value).incidents :
        [];
      const selTemplate = compile(currentTemplate);
      const unparsedTemp = selTemplate(currentVariables);
      currentMessage = unparsedTemp.toString();
      if (currentVariables !== {}) {
        createActionToGetRecommendations();
      }
      renderUI(currentServices, currentMessage, null, incidents);
    });
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
