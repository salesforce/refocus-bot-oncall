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
'use strict';

const express = require('express');
const request = require('superagent');
const app = express();
const http = require('http');
const env = process.env.NODE_ENV || 'dev';
const PORT = process.env.PORT || 5000;
const socketToken = process.env.SOCKET_TOKEN;
const pdToken = process.env.PD_TOKEN;
const config = require('./config.js')[env];
const packageJSON = require('./package.json');
const bdk = require('@salesforce/refocus-bdk')(config);

// Installs / Updates the Bot
bdk.installOrUpdateBot(packageJSON);

//Event Handling
bdk.refocusConnect(app, socketToken);
app.on('refocus.events', handleEvents);
app.on('refocus.bot.actions', handleActions);
app.on('refocus.bot.data', handleData);
app.on('refocus.room.settings', handleSettings);

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
    "incident":
    {
      "type": "incident",
      "title": message,
      "service":
      {
        "id": group,
        "type": "service_reference"
      }
    }
  };

  return new Promise((resolve, reject) => {
    request
    .post('https://api.pagerduty.com/incidents')
    .send(obj)
    .set('Authorization', `Token token=${pdToken}`)
    .set('Accept', 'application/vnd.pagerduty+json;version=2')
    .set('From', 'tausif.muzaffar@salesforce.com')
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
  if(action.name === 'getServices'){
    if(!action.response && action.isPending){
      const id = action.id;
      getServices(0).then(function(result) {
        bdk.respondBotAction(id, result);
      });
    }
  }

  if(action.name === 'pagerServices'){
    if(!action.response && action.isPending){
      const id = action.id;
      const params = action.parameters;
      const services = params.filter(param => param.name == 'services')[0];
      const message = params.filter(param => param.name == 'message')[0].value;
      console.log(services)
      services.value.forEach((service) => {
        pdTriggerEvent(service,message).then((res) => console.log(res));
      })
    }
  }
}

app.use(express.static('web/dist'));
app.get('/*', function(req, res){
  res.sendFile(__dirname + '/web/dist/index.html');
});

http.Server(app).listen(PORT, function(){
  console.log('listening on: ', PORT);
});
