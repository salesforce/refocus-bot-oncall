/**
 * Copyright (c) 2020, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./autoPager.js
 *
 *  This code handles the process of determining
 *  whether or not to auto-page any teams when onCallBotData
 *  is updated.
 */

const { env } = require('../config.js');
const { compile } = require('handlebars');
const config = require('../config.js')[env];
const bdk = require('@salesforce/refocus-bdk')(config);
const pagerDuty = require('./pagerDuty.js');
const packageJSON = require('../package.json');
const {
  removeAlreadyPagedTeams,
  removeTeamsWithoutMatchingSeverity
} = require('./pageTeamsFilterFunctions.js');

/**
 * @param {number} roomId
 * @param {string} botId
 * @returns {Array<Incident> | undefined}
 */
async function getIncidentsForRoom(roomId, botId) {
  const incidents = await bdk.getBotData(roomId, botId, 'onCallIncidents');
  if (!incidents?.body?.[0]?.value) return [];
  try {
    const value = JSON.parse(incidents.body[0].value)?.incidents || [];
    return value;
  } catch (e) {
    bdk.log.error(
      `Room ${roomId} - Failed to parse incidents when autopaging.`,
      e
    );
    return [];
  }
}

/**
 * @param {string} roomId
 * @returns {Array<object>} - teams to autoPage from room settings
 */
async function getTeamsToAutoPage(roomId) {
  const room = await bdk.getRoomById(roomId);
  return room?.settings?.autoPageTeams;
}

/**
 *
 * @param {object} botData - onCallBotData object.
 * @returns {string} - message to be sent with page alert.
 */
async function getPagerAlertMessage(botData) {
  const { roomId, botId } = botData;
  const pageMessageBotData = await bdk.getBotData(
    roomId,
    botId,
    'onCallBotTemplate'
  );
  const pageMessage = pageMessageBotData.body?.[0]?.value;
  if (!pageMessage) return '';
  const caseVariables = JSON.parse(botData.value);
  const pageMessageTemplate = compile(pageMessage);
  const populatedPageMessage = pageMessageTemplate(caseVariables).toString();
  return populatedPageMessage;
}

/**
 * Takes in the responses from pagerduty and generates a timeline event.
 * @param {Array} incidentResponses - Responses from page requests to Pagerduty
 * @param {number} roomId - Id of room in which page was sent
 */
function createPagedEvent(incidentResponses, roomId) {
  let responseText = '';
  incidentResponses
    .filter((request) => request.statusCode === 201)
    .map((successfulRequest) => successfulRequest.body.incident.service.summary)
    .forEach((serviceName, i) => {
      responseText += i === 0 ? `Successfully Paged: ${serviceName}` : `, ${serviceName}`;
    });

  incidentResponses
    .filter((request) => request.statusCode !== 201 && request.body.incident)
    .map((unsuccessfulRequest) => unsuccessfulRequest.body.incident.service.summary)
    .forEach((serviceName, i) => {
      responseText += i === 0 ? ` Failed to Page: ${serviceName}` : `, ${serviceName}`;
    });

  incidentResponses
    .filter((request) => request.body.error && !request?.body?.incident)
    .map((erroredRequest) => erroredRequest.body.error.errors)
    .forEach((errors) => {
      errors.forEach((error, i) => {
        responseText += i === 0 ? error : `, ${error}`;
      });
    });
  const log = packageJSON.name + ' has ' + responseText;
  if (responseText === '') return;

  bdk.createEvents(roomId, log, { type: 'Event', name: 'AutoPage' }, 'Event');
}

/**
 *
 * @param {object} botData - onCallBotData object.
 * @param {string} severity - current severity of case.
 */
async function pageTeams(botData, severity) {
  const { roomId, botId } = botData;
  const incidentList = await getIncidentsForRoom(roomId, botId);
  const teamsToAutoPageFromRoomType = await getTeamsToAutoPage(roomId);
  if (!teamsToAutoPageFromRoomType?.length) return;
  const notYetPagedTeams = removeAlreadyPagedTeams(
    incidentList,
    teamsToAutoPageFromRoomType
  );
  const teamsToPage = removeTeamsWithoutMatchingSeverity(
    notYetPagedTeams,
    severity
  );
  const pageMessage = await getPagerAlertMessage(botData);
  bdk.log.info(`Room ${roomId} - auto paging ${JSON.stringify(teamsToPage)}`);
  const pageRequests = teamsToPage
    .map((team) => pagerDuty.triggerEvent(team.id, pageMessage, roomId));

  Promise.all(pageRequests).then((incidents) => {
    const newIncidents = incidents
      .filter((request) => request.statusCode === 201)
      .map((res) => ({
        incident: {
          id: res.body.incident.id,
          url: res.body.incident.html_url,
          number: res.body.incident.incident_number,
        },
        service: res.body.incident.service,
        assignment: res.body.incident.assignments,
      }));
    newIncidents.forEach((incident) => {
      bdk.log.info('Successfully Paged:', incident.incident.service);
      bdk.log.info('Incident Id:', incident.incident.id);
    });

    incidentList.concat(newIncidents);
    bdk.upsertBotData(roomId, botId, 'onCallIncidents', { incidents: incidentList });
    createPagedEvent(incidents, roomId);
  });
}

module.exports = {
  getIncidentsForRoom,
  getTeamsToAutoPage,
  pageTeams,
};
