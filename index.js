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
const { env, pdToken, pdSender } = require('./config.js');
const PORT = require('./config.js').port;
const config = require('./config.js')[env];
const { socketToken } = config;
const POLLING_DELAY = config.pollingDelay;
const bdk = require('@salesforce/refocus-bdk')(config);
const packageJSON = require('./package.json');
const serialize = require('serialize-javascript');
const createTTE = require('./utils/tte.js').createTTE;
const botName = packageJSON.name;
const ZERO = 0;
const SUCCESS_CODE = 201;
const SERVICES_LIMIT = 100;
let roomsToUpdate = [];

// Installs / Updates the Bot
bdk.installOrUpdateBot(packageJSON)
  .then(() => {
    bdk.refocusConnect(app, socketToken, packageJSON.name);
  });

let services = [];
const serviceMap = {};

/**
 * Query PagerDuty for services
 *
 * @param {Integer} offset - Amount of services to offset
 * @returns {Promise} - PagerDuty get service promise
 */
function pdServices(offset) {
  return new Promise((resolve) => {
    request
      .get('https://api.pagerduty.com/services?limit=100&offset=' + offset)
      .set('Authorization', `Token token=${pdToken}`)
      .set('Accept', 'application/vnd.pagerduty+json;version=2')
      .then((res, error) => {
        if (error) bdk.log.error('pdServices error', error);

        console.log("********inside pdServices ************")

        resolve(res);
      }).catch((error) => {
        console.log("********inside pdServices Catch ************")
        bdk.log.error('pdServices error', error)
      });
  });
}

// https://api.pagerduty.com/incidents/{id}/log_entries


/**
 * Query PagerDuty for incident details
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
      .end((error, res) => {
        resolve(res);
      })
      .catch((error) => bdk.log.error(
        'pdIncidentDetail error', error));
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
            tteList.push(createTTE(obj.service.summary, result));
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
      .end((error, res) => {
        resolve(res);
      });
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
      .filter((room) => room.roomId === event.roomId).length > ZERO) {
      roomsToUpdate = roomsToUpdate
        .filter((room) => room.roomId !== event.roomId);
    } else {
      const newRoom = { roomId: event.roomId, botId: botName };
      roomsToUpdate.push(newRoom);
    }
    updateLocalRoomData();
  }
}

/**
 * When a refocus.bot.data is dispatch it is handled here.
 *
 * @param {BotData} data - Bot Data object that was dispatched
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
    .filter((room) => room.roomId === roomInfo.roomId).length > ZERO;
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
 * Reads the local active rooms file if it exists and updates roomsToUpdate.
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
        updateLocalRoomData();
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
      bdk.getBotData(obj.roomId, obj.botId, 'onCallIncidents')
        .then((data) => {
          if (data.body && data.body[ZERO]) {
            const parsedData = JSON.parse(data.body[ZERO].value);
            const pdData = parsedData.incidents;
            getIncidents(pdData).then((tteList) => {
              bdk.upsertBotData(
                obj.roomId,
                obj.botId,
                'onCallTTe',
                serialize(tteList)
              );
            });
          }
        });
    }
  }));
}

/**
 * When a refocus.room.settings is dispatch it is handled here.
 *
 * @param {Room} room - Room object that was dispatched
 */
function handleSettings(room) {
  bdk.log.info('Room Settings Activity', room.name);
}

/**
 * When a refocus.bot.actions is dispatch it is handled here.
 *
 * @param {BotAction} action - Bot Action object that was dispatched
 */
function handleActions(action) {
  bdk.log.info('Bot Action Activity',
    action.new ? action.new.name : action.name
  );

  if (action.name === 'getServices') {
    if (!action.response && action.isPending) {
      const id = action.id;
      getServices(ZERO).then((result) => {
        bdk.respondBotActionNoLog(id, result);
      });
    }
  }

  if (action.name === 'pagerServices') {
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
            } else if (res.body.incident) {
              unsuccessfullyPaged.push(res.body.incident.service.summary);
            } else if (res.body.error) {
              res.body.error.errors.forEach((error, i) => {
                if (i === ZERO) {
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
app.on('refocus.events', handleEvents);
app.on('refocus.bot.actions', handleActions);
app.on('refocus.bot.data', handleData);
app.on('refocus.room.settings', handleSettings);
app.use(express.static('web/dist'));
app.get('/*', (req, res) => {
  res.sendFile(path.join(__dirname, '/web/dist/index.html'));
});

// Getting list of active rooms from last session
readActiveRoomsFile();

// When the bot starts, store all of the active rooms in file
storeActiveRoomsOnStart();
setInterval(updateActiveRoomIncidents, POLLING_DELAY);
updateActiveRoomIncidents();

http.Server(app).listen(PORT, () => {
  bdk.log.info('listening on: ', PORT);
});
