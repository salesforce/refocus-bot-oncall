/**
 * Copyright (c) 2017, salesforce.com, inc.
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

const express = require('express');
const request = require('superagent');
const app = express();
const http = require('http');
const env = process.env.NODE_ENV || 'dev';
const PORT = process.env.PORT || 5000;
const config = require('./config.js')[env];
const { socketToken, pdToken, pdSender } = config;
const packageJSON = require('./package.json');
const bdk = require('@salesforce/refocus-bdk')(config);
const ZERO = 0;
const ONE = 1;
const SUCCESS_CODE = 201;

// Installs / Updates the Bot
bdk.installOrUpdateBot(packageJSON);

// Event Handling
bdk.refocusConnect(app, socketToken);

let services = [];
const serviceMap = {};

function pdServices(offset){
  return new Promise((resolve, reject) => {
    request
      .get('https://api.pagerduty.com/services?limit=100&offset='+offset)
      .set('Authorization', `Token token=${pdToken}`)
      .set('Accept', 'application/vnd.pagerduty+json;version=2')
      .end((error, res) => {
        resolve(res);
      });
  });
}

function getServices(offset) {
  return pdServices(offset).then((result) => {
    if (result.body.more) {
      services = services.concat(result.body.services);
      return getServices(offset+100);
    }

    services = services.concat(result.body.services);
    services.forEach((service) => {
      serviceMap[service.name] = service.id;
    });

    return serviceMap;
  });
}

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

  return new Promise((resolve, reject) => {
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
 * @return null
 */
function handleEvents(event){
  console.log('Event Activity', event);
}

/**
 * When a refocus.room.settings is dispatch it is handled here.
 *
 * @param {Room} room - Room object that was dispatched
 * @return null
 */
function handleSettings(room){
  console.log('Room Settings Activity', room.id);
}

/**
 * When a refocus.bot.data is dispatch it is handled here.
 *
 * @param {BotData} data - Bot Data object that was dispatched
 */
function handleData(data){
  console.log('Bot Data Activity', data.new ? data.new.name : data.name);
}

/**
 * When a refocus.bot.actions is dispatch it is handled here.
 *
 * @param {BotAction} action - Bot Action object that was dispatched
 */
function handleActions(action){
  console.log('Bot Action Activity',
    action.new ? action.new.name : action.name
  );

  if (action.name === 'getServices'){
    if (!action.response && action.isPending){
      const id = action.id;
      getServices(ZERO).then(function(result) {
        bdk.respondBotAction(id, result);
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
          bdk.respondBotAction(id, response);
        });
    }
  }
}

app.on('refocus.events', handleEvents);
app.on('refocus.bot.actions', handleActions);
app.on('refocus.bot.data', handleData);
app.on('refocus.room.settings', handleSettings);

app.use(express.static('web/dist'));
app.get('/*', (req, res) => {
  res.sendFile(__dirname + '/web/dist/index.html');
});

http.Server(app).listen(PORT, function(){
  console.log('listening on: ', PORT);
});
