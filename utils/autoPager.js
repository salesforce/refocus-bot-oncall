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
  if (!incidents?.body?.[0].value) return [];
  try {
    return JSON.parse(incidents.body[0].value)?.incidents;
  } catch (e) {
    bdk.log.error(
      `Room ${roomId} - Failed to parse incidents when autopaging.`,
      e
    );
    return undefined;
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
  teamsToPage.forEach((team) => {
    pagerDuty.triggerEvent(team.id, pageMessage, roomId);
  });
}

module.exports = {
  getIncidentsForRoom,
  getTeamsToAutoPage,
  pageTeams,
};
