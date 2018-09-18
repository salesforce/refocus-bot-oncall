/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./index.js
 *
 * This code handles will listen to refocus and handle any activity
 * that requires the bot server attention.
 */

require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const request = require('superagent');
const env = require('./config.js').env;
const PORT = require('./config.js').port;
const config = require('./config.js')[env];
const { socketToken, pdToken, pdSender } = config;
const bdk = require('@salesforce/refocus-bdk')(config);
const packageJSON = require('./package.json');
const ZERO = 0;
const SUCCESS_CODE = 201;
const SERVICES_LIMIT = 100;

// Installs / Updates the Bot
bdk.installOrUpdateBot(packageJSON);

let services = [];
const serviceMap = {};

/**
 * Query PagerDuty for services
 *
 * @param {Integer} offset - Amount of services to offset
 * @returns {Promise} - PagerDuty get service promise
 */
function pdServices(offset){
  return new Promise((resolve) => {
    request
      .get('https://api.pagerduty.com/services?limit=100&offset='+offset)
      .set('Authorization', `Token token=${pdToken}`)
      .set('Accept', 'application/vnd.pagerduty+json;version=2')
      .end((error, res) => {
        resolve(res);
      });
  });
}

/**
 * Get all services
 *
 * @param {Integer} offset - Amount of services to offset
 * @returns {Object} - All the services from PagerDuty
 */
function getServices(offset) {
  return pdServices(offset).then((result) => {
    if (result.body.more) {
      services = services.concat(result.body.services);
      return getServices(offset + SERVICES_LIMIT);
    }

    services = services.concat(result.body.services);
    services.forEach((service) => {
      if (service.name) {
        serviceMap[service.name] = service.id;
      } else {
        bdk.log.warn('service missing name',service)
      }
    });

    return serviceMap;
  });
}

/**
 * Create PagerDuty Trigger Event
 *
 * @param {String} group - Action Object
 * @param {String} message - Salesforce Query
 * @param {Integer} room - Room Id
 * @returns {Promise} - PagerDuty trigger promise
 */
function pdTriggerEvent(group, message, room){
  const obj =
  {
    'incident':
    {
      'type': 'incident',
      'title': message,
      'service':
      {
        'id': group,
        'type': 'service_reference'
      },
      'body':
      {
        'type': 'incident_body',
        'details': message,
        'roomId': room
      }
    }
  };

  return new Promise((resolve) => {
    request
      .post('https://api.pagerduty.com/incidents')
      .send(obj)
      .set('Authorization', `Token token=${pdToken}`)
      .set('Accept', 'application/vnd.pagerduty+json;version=2')
      .set('From', pdSender)
      .end((error, res) => {
        resolve(res);
      });
  });
}

/**
 * When a refocus.events is dispatch it is handled here.
 *
 * @param {Event} event - The most recent event object
 */
function handleEvents(event){
  bdk.log.info('Event Activity', event.roomId);
}

/**
 * When a refocus.room.settings is dispatch it is handled here.
 *
 * @param {Room} room - Room object that was dispatched
 */
function handleSettings(room){
  bdk.log.info('Room Settings Activity', room.name);
}

/**
 * When a refocus.bot.data is dispatch it is handled here.
 *
 * @param {BotData} data - Bot Data object that was dispatched
 */
function handleData(data){
  bdk.log.info('Bot Data Activity', data.new ? data.new.name : data.name);
}

/**
 * When a refocus.bot.actions is dispatch it is handled here.
 *
 * @param {BotAction} action - Bot Action object that was dispatched
 */
function handleActions(action){
  bdk.log.info('Bot Action Activity',
    action.new ? action.new.name : action.name
  );

  if (action.name === 'getServices'){
    if (!action.response && action.isPending){
      const id = action.id;
      getServices(ZERO).then((result) => {
        bdk.respondBotActionNoLog(id, result);
      });
    }
  }

  if (action.name === 'pagerServices'){
    const successfullyPaged = [];
    const unsuccessfullyPaged = [];
    let responseText = '';

    if (!action.response && action.isPending) {
      const id = action.id;
      const params = action.parameters;
      const selectedServices = params.filter((param) =>
        param.name === 'services')[ZERO];
      const message = params.filter((param) =>
        param.name === 'message')[ZERO].value;
      const response = {};
      const incidentList = [];
      const pdIncidents = [];
      selectedServices.value.forEach((service) => {
        pdIncidents.push(pdTriggerEvent(service, message, action.roomId));
      });
      Promise.all(pdIncidents)
        .then((incidents) => {
          incidents.forEach((res) => {
            if (res.statusCode === SUCCESS_CODE) {
              successfullyPaged.push(res.body.incident.service.summary);
            } else {
              unsuccessfullyPaged.push(res.body.incident.service.summary);
            }

            incidentList.push({
              'incident': {
                'id': res.body.incident.id,
                'url': res.body.incident.html_url,
                'number': res.body.incident.incident_number,
              },
              'service': res.body.incident.service,
              'assignment': res.body.incident.assignments,
            });
          });

          successfullyPaged.forEach((serviceName, i) => {
            if (i === ZERO) {
              responseText += `Successfully Paged: ${serviceName}`;
            } else {
              responseText += `, ${serviceName}`;
            }
          });

          unsuccessfullyPaged.forEach((serviceName, i) => {
            if (i === ZERO) {
              responseText += ` Failed to Page: ${serviceName}`;
            } else {
              responseText += `, ${serviceName}`;
            }
          });

          response.statusText = responseText;
          response.incidents = incidentList;
          const eventLog = {
            'log': packageJSON.name + ' has ' + responseText,
            'context': {
              'type': 'Event',
            },
          };
          bdk.respondBotAction(id, response, eventLog);
        });
    }
  }
}

// Event Handling
bdk.refocusConnect(app, socketToken, packageJSON.name);
app.on('refocus.events', handleEvents);
app.on('refocus.bot.actions', handleActions);
app.on('refocus.bot.data', handleData);
app.on('refocus.room.settings', handleSettings);
app.use(express.static('web/dist'));
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '/web/dist/index.html'));
});

http.Server(app).listen(PORT, () => {
  bdk.log.info('listening on: ', PORT);
});
