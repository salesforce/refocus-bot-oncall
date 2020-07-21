const { pdToken, pdSender, env } = require('./config.js');
const config = require('./config.js')[env];
const bdk = require('@salesforce/refocus-bdk')(config);
const request = require('superagent');
const createTTE = require('./utils/tte.js').createTTE;

const { useNewPDBridge, pdBridgeUrl } = config;
const USING_NEW_PD_BRIDGE = Boolean(useNewPDBridge && pdBridgeUrl);
const pagerDutyServicesUrl = 'https://api.pagerduty.com/services';


/**
 * Create PagerDuty Trigger Event
 *
 * @param {String} group - Action Object
 * @param {String} message - Salesforce Query
 * @param {Integer} room - Room Id
 * @returns {Promise} - PagerDuty trigger promise
 */
function triggerEvent(group, message, room) {
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
 * Query PagerDuty for services
 *
 * @param {Integer} offset - Amount of services to offset
 * @returns {Promise} - PagerDuty get service promise
 */
function queryServices(offset) {
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
function getIncidentDetail(id) {
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
        return getIncidentDetail(obj.incident.id).then((result) => {
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

module.exports = {
  triggerEvent,
  queryServices,
  getIncidentDetail,
  getIncidents,
};
