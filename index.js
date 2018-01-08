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

// Installs / Updates the Bot
bdk.installOrUpdateBot(packageJSON);

// Event Handling
bdk.refocusConnect(app, socketToken);

let services = [];
let serviceMap = {};

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
  return pdServices(offset).then(function(result) {
    if (result.body.more) {
      services = services.concat(result.body.services);
      return getServices(offset+100);
    } else {
      services = services.concat(result.body.services);
      services.forEach((service) => {
        serviceMap[service.name] = service.id;
      })
      return serviceMap;
    }
  });
}

function pdTriggerEvent(group, message){
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
        'details': message
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
 * @return null
 */
function handleData(data){
  console.log('Bot Data Activity', data.name);
}

/**
 * When a refocus.bot.actions is dispatch it is handled here.
 *
 * @param {BotAction} action - Bot Action object that was dispatched
 * @return null
 */
function handleActions(action){
  console.log('Bot Action Activity', action.name);

  if (action.name === 'getServices'){
    if (!action.response && action.isPending){
      const id = action.id;
      getServices(ZERO).then(function(result) {
        bdk.respondBotAction(id, result);
      });
    }
  }

  if (action.name === 'pagerServices'){
    let successfullyPaged = [];
    let unsuccessfullyPaged = [];
    let responseText = '';

    if (!action.response && action.isPending){
      const id = action.id;
      const params = action.parameters;
      const services = params.filter(param => param.name == 'services')[ZERO];
      const message = params.filter(param => param.name == 'message')[ZERO].value;
      const response = {};
      console.log(services)
      services.value.forEach((service, index) => {
        pdTriggerEvent(service, message).then((res) => {
          if (res.statusCode === 201) {
            successfullyPaged.push(res.body.incident.service.summary);
          } else {
            unsuccessfullyPaged.push(res.body.incident.service.summary);
          }

          if (index === services.value.length - ONE) {
            if (successfullyPaged.length > ZERO) {
              responseText += 'Paged: ';
              successfullyPaged.forEach((serviceName) => {
                responseText += `${serviceName} `;
              });
            }

            if (unsuccessfullyPaged.length > ZERO) {
              responseText += 'Error: ';
              unsuccessfullyPaged.forEach((serviceName) => {
                responseText += `${serviceName} `;
              });
            }

            response.statusText = responseText;
            bdk.respondBotAction(id, response);
          }
        });
      });
    }
  }
}

app.on('refocus.events', handleEvents);
app.on('refocus.bot.actions', handleActions);
app.on('refocus.bot.data', handleData);
app.on('refocus.room.settings', handleSettings);

app.use(express.static('web/dist'));
app.get('/*', function(req, res){
  res.sendFile(__dirname + '/web/dist/index.html');
});

http.Server(app).listen(PORT, function(){
  console.log('listening on: ', PORT);
});
