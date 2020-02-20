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
const fs = require('fs');
const request = require('superagent');
const { env, pdToken, pdSender, tteToggle } = require('./config.js');
const PORT = require('./config.js').port;
const config = require('./config.js')[env];
const { socketToken, recommendationUrl,
  useNewPDBridge, pdBridgeUrl } = config;
const POLLING_DELAY = config.pollingDelay;
const bdk = require('@salesforce/refocus-bdk')(config);
const packageJSON = require('./package.json');
const createTTE = require('./utils/tte.js').createTTE;
const getRecommendations = require('./utils/recommendations.js')
  .getRecommendations;
const botName = packageJSON.name;
const DEFAULT_OFFSET = 0;
const HEAD = 0;
const SUCCESS_CODE = 201;
const SERVICES_LIMIT = 100;
const USING_NEW_PD_BRIDGE = Boolean(useNewPDBridge && pdBridgeUrl);
const tteRoomUpdateDelay = 500;
const pagerDutyServicesUrl = 'https://api.pagerduty.com/services';
let roomsToUpdate = [];

/* eslint-disable func-style */

bdk.installOrUpdateBot(packageJSON)
  .then(() => bdk.refocusConnect(app, socketToken, packageJSON.name));

let services = [];
const serviceMap = {};

/**
 * Query PagerDuty for services
 *
 * @param {Integer} offset - Amount of services to offset
 * @returns {Promise} - PagerDuty get service promise
 */
function pdServices(offset) {
  // Feature Flag
  const url = USING_NEW_PD_BRIDGE ? pdBridgeUrl :
    `${pagerDutyServicesUrl}?limit=100&offset=${offset}`;
  return new Promise((resolve) => {
    const req = request
      .get(url)
      .timeout({
        response: 5000, // Wait 5 seconds for the server to start sending,
        deadline: 30000, // but allow 30 seconds for the file to finish loading.
      });
    // Feature Flag
    if (!USING_NEW_PD_BRIDGE) {
      req
        .set('Authorization', `Token token=${pdToken}`)
        .set('Accept', 'application/vnd.pagerduty+json;version=2');
    }
    req
      .then((res) => {
        resolve(res);
      }).catch((error) => {
        bdk.log.error('pdServices error', error);
        resolve({
          body: {
            more: true
          }
        });
      });
  });
}

/**
 * Query PagerDuty for incident details
 *
 * https://api.pagerduty.com/incidents/{id}/log_entries
 *
 * @param {string} id - Incident to query
 * @returns {Promise} - PagerDuty get service promise
 */
function pdIncidentDetail(id) {
  return new Promise((resolve) => {
    request
      .get(`https://api.pagerduty.com/incidents/${id}/log_entries`)
      .set('Authorization', `Token token=${pdToken}`)
      .set('Accept', 'application/vnd.pagerduty+json;version=2')
      .then((res) => resolve(res))
      .catch((error) => bdk.log.error('pdIncidentDetail error', error));
  });
}

/**
 * @param {Integer} offset - Amount of services to offset
 * @returns {Object} - All the services from PagerDuty
 */
function getServices(offset) {
  return pdServices(offset).then((result) => {
    if (!result.body) return {};
    // Feature Flag
    const resBody = USING_NEW_PD_BRIDGE ? result.body : result.body.services;
    services = services.concat(resBody);
    // Feature Flag
    if (!USING_NEW_PD_BRIDGE && result.body.more) {
      return getServices(offset + SERVICES_LIMIT);
    }

    services.forEach((service) => {
      if (service) {
        if (service.name) {
          serviceMap[service.name] = service.id;
        } else {
          bdk.log.warn('service missing name', service);
        }
      } else {
        bdk.log.warn('broken service');
      }
    });

    return serviceMap;
  });
}

/**
 * Get all incident timestamps
 *
 * @param {Array} pdData - list of pagerduty data
 * @returns {Array} - All the ttes
 */
function getIncidents(pdData) {
  const tteList = [];
  return new Promise((resolve) => {
    // eslint-disable-next-line consistent-return
    Promise.all(pdData.map((obj) => {
      if (obj.incident) {
        return pdIncidentDetail(obj.incident.id).then((result) => {
          if (result.body) {
            tteList.push(createTTE(obj.incident.id,
              obj.service.summary, result));
          }
        });
      }
    })).then(() => resolve(tteList))
      .catch((err) => bdk.log.error(err));
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
function pdTriggerEvent(group, message, room) {
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
      .then((res) => {
        resolve(res);
      }).catch((error) => bdk.log.error(
        'pdTriggerEvent error', error));
  });
}

/**
 * Saves the current list of active rooms to a json file locally
 * can be read on restart to make active room list persistent.
 * @returns {Promise} - resolves when data is saved, or error occurs
 */
function updateLocalRoomData() {
  return new Promise((resolve, reject) => {
    fs.writeFile('activeRooms.json',
      JSON.stringify(roomsToUpdate), 'utf8', (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
  });
}

/**
 * When a refocus.events is dispatch it is handled here.
 *
 * @param {Event} event - The most recent event object
 */
function handleEvents(event) {
  bdk.log.info('Event Activity', event.roomId);
  if (event.context.type === 'RoomState') {
    // If a room is deactivated take it it out of 'roomsToUpdate'
    if (!event.context.active && roomsToUpdate
      .filter((room) => room.roomId === event.roomId).length > DEFAULT_OFFSET) {
      roomsToUpdate = roomsToUpdate
        .filter((room) => room.roomId !== event.roomId);
    } else {
      const newRoom = { roomId: event.roomId, botId: botName };
      roomsToUpdate.push(newRoom);
    }
    updateLocalRoomData()
      .catch((error) => bdk.log.error('updateLocalRoomData', error));
  }
}

/**
 * When a refocus.bot.data is dispatch it is handled here.
 *
 * @param {Object} data - Bot Data object that was dispatched
 */
function handleData(data) {
  bdk.log.info('Bot Data Activity',
    data.new ? data.new.name : data.name);

  if (data.name === 'onCallIncidents') {
    const roomId = data.roomId;
    const newRoom = { roomId, botId: botName };
    roomsToUpdate.push(newRoom);
  }
}

/**
 * Adds a room to the list of active rooms
 * to be regularly updated with trust data
 *
 * @param {Object} roomInfo - information of room requesting data
 */
function updateActiveRoomsList(roomInfo) {
  let isActive = false;
  const alreadyInList = roomsToUpdate
    .filter((room) => room.roomId === roomInfo.roomId).length > DEFAULT_OFFSET;
  bdk.findRoom(roomInfo.roomId)
    .then((res) => {
      isActive = res.body.active;
      if (isActive && !alreadyInList) {
        const newRoom = { roomId: roomInfo.roomId, botId: botName };
        roomsToUpdate.push(newRoom);
        try {
          updateLocalRoomData().catch((err) => {
            throw err;
          });
        } catch (error) {
          bdk.log.error(error);
        }
      }
    });
}

/**
 * Used to store all of the active rooms when the server starts.
 */
function storeActiveRoomsOnStart() {
  bdk.getActiveRooms().then((res) => {
    const activeRooms = res.body;
    activeRooms.forEach((room) => {
      if (room.bots.includes(botName)) {
        const roomInfo = {
          roomId: room.id,
          botId: botName
        };
        updateActiveRoomsList(roomInfo);
      }
    });
  });
}

/**
 * Getting list of active rooms from last session. Reads the local active rooms
 * file if it exists and updates roomsToUpdate.
 */
function readActiveRoomsFile() {
  fs.readFile('activeRooms.json', 'utf8', (err, data) => {
    if (err) {
      roomsToUpdate = [];
    } else {
      roomsToUpdate = JSON.parse(data);
      const newRoomsToUpdate = [];
      const rooms = [];
      for (let i = 0; i < roomsToUpdate.length; i++) {
        rooms.push(bdk.findRoom(roomsToUpdate[i].roomId));
      }
      Promise.all(rooms).then((roomData) => {
        for (let i = 0; i < roomData.length; i++) {
          if (roomData[i].body.active) {
            newRoomsToUpdate.push(roomsToUpdate[i]);
          }
        }
        roomsToUpdate = newRoomsToUpdate;
        updateLocalRoomData()
          .catch((error) => bdk.log.error('updateLocalRoomData', error));
      });
    }
  });
}

/**
 * Refreshes the saved incidents of the currently active rooms
 */
function updateActiveRoomIncidents() {
  Promise.all(roomsToUpdate.map((obj) => {
    if (obj.roomId && obj.botId) {
      setTimeout(() => {
        bdk.getBotData(obj.roomId, obj.botId, 'onCallIncidents')
          .then((data) => {
            if (data.body && data.body[HEAD]) {
              const parsedData = JSON.parse(data.body[HEAD].value);
              const pdData = parsedData.incidents;
              getIncidents(pdData).then((tteList) => {
                bdk.upsertBotData(
                  obj.roomId,
                  obj.botId,
                  'onCallTTx',
                  { tte: tteList }
                ).catch((error) => bdk.log
                  .error('updateActiveRoomIncidents', error));
              });
            }
          });
      }, tteRoomUpdateDelay);
    }
  }));
}

/**
 * When a refocus.room.settings is dispatch it is handled here.
 *
 * @param {Object} room - Room object that was dispatched
 */
function handleSettings(room) {
  bdk.log.info('Room Settings Activity', room.name);
}

const pageServicesAction = (action) => {
  const successfullyPaged = [];
  const unsuccessfullyPaged = [];
  let responseText = '';

  if (!action.response && action.isPending) {
    const id = action.id;
    const params = action.parameters;
    const selectedServices = params.filter((param) =>
      param.name === 'services')[HEAD];
    const message = params.filter((param) =>
      param.name === 'message')[HEAD].value;
    const response = {};
    const incidentList = [];
    const pdIncidents = [];
    selectedServices.value
      .forEach((service) => {
        pdIncidents.push(pdTriggerEvent(service, message, action.roomId));
      });
    Promise.all(pdIncidents)
      .then((incidents) => {
        incidents.forEach((res) => {
          if (res.statusCode === SUCCESS_CODE) {
            successfullyPaged.push(res.body.incident.service.summary);
          } else if (res.body.incident) {
            unsuccessfullyPaged.push(res.body.incident.service.summary);
          } else if (res.body.error) {
            res.body.error.errors.forEach((error, i) => {
              if (i === HEAD) {
                responseText += error;
              } else {
                responseText += `, ${error}`;
              }
            });
          }

          if (res.body.incident) {
            bdk.log.info('Successfully Paged:', res.body.incident.service);
            bdk.log.info('Incident Id:', res.body.incident.id);
            incidentList.push({
              'incident': {
                'id': res.body.incident.id,
                'url': res.body.incident.html_url,
                'number': res.body.incident.incident_number,
              },
              'service': res.body.incident.service,
              'assignment': res.body.incident.assignments,
            });
          }
        });

        successfullyPaged.forEach((serviceName, i) => {
          if (i === DEFAULT_OFFSET) {
            responseText += `Successfully Paged: ${serviceName}`;
          } else {
            responseText += `, ${serviceName}`;
          }
        });

        unsuccessfullyPaged.forEach((serviceName, i) => {
          if (i === DEFAULT_OFFSET) {
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
        bdk.respondBotAction(id, response, eventLog, null)
          .catch((error) => bdk.log.error('respondBotAction', error));
      });
  }
};

const getRecommendationsAction = (action) => {
  if (!action.response && action.isPending) {
    const id = action.id;
    const params = action.parameters;
    const caseData = params
      .filter((param) => param.name === 'caseData')[HEAD].value;
    if (recommendationUrl) {
      const parsedData = JSON.parse(caseData);
      getRecommendations(recommendationUrl, parsedData)
        .then((recommendations) => {
          bdk.respondBotActionNoLog(id, { recommendations })
            .catch((error) => bdk.log.error('respondBotActionNoLog', error));
        });
    } else {
      bdk.respondBotActionNoLog(id, { error: 'recommendationUrl not set' })
        .catch((error) => bdk.log.error('respondBotActionNoLog', error));
    }
  }
};

const getServicesAction = (action) => {
  if (!action.response && action.isPending) {
    const id = action.id;
    getServices(DEFAULT_OFFSET).then((result) => {
      bdk.respondBotActionNoLog(id, result)
        .catch((error) => bdk.log.error('respondBotActionNoLog', error));
    });
  }
};

const handleActionsDispatcher = {
  'pagerServices': pageServicesAction,
  'getRecommendations': getRecommendationsAction,
  'getServices': getServicesAction,
};

/**
 * When a refocus.bot.actions is dispatch it is handled here.
 *
 * @param {Object} action - Bot Action object that was dispatched
 */
function handleActions(action) {
  bdk.log
    .info('Bot Action Activity', action.new ? action.new.name : action.name);

  const handler = handleActionsDispatcher[action.name];
  if (handler) handler(action);
}

app.on('refocus.events', handleEvents);
app.on('refocus.bot.actions', handleActions);
app.on('refocus.bot.data', handleData);
app.on('refocus.room.settings', handleSettings);
app.use(express.static('web/dist'));
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '/web/dist/index.html'));
});

readActiveRoomsFile();

// When the bot starts, store all of the active rooms in file
storeActiveRoomsOnStart();
if (tteToggle) {
  setInterval(updateActiveRoomIncidents, POLLING_DELAY);
  updateActiveRoomIncidents();
}

http.Server(app).listen(PORT, () => {
  bdk.log.info('listening on: ', PORT);
});
