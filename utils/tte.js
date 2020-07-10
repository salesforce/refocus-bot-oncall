/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * ./utils/tte.js
 *
 * This code handles will creation of tte from given data
 */
const ZERO = 0;

/**
 * Create TTE
 * @param {String} id - pager duty id
 * @param {String} team - team paged
 * @param {Array} pdData - list of pagerduty data
 * @returns {Object} - A tte
 */
function createTTE(id, team, pdData) {
  if (!pdData || !pdData.body || !pdData.body.log_entries) return null;
  const entries = pdData.body.log_entries;
  const notify = entries
    .filter((entry) => entry.type === 'notify_log_entry')[ZERO];
  const ack = entries
    .filter((entry) => entry.type === 'acknowledge_log_entry')[ZERO];
  const resolve = entries
    .filter((entry) => entry.type === 'resolve_log_entry')[ZERO];

  const tte = {};
  tte.start = notify ? notify.created_at : null;
  if (ack) {
    tte.end = ack.created_at;
  } else if (resolve) {
    tte.end = resolve.created_at;
  } else {
    tte.end = null;
  }

  tte.team = team;
  tte.id = id;
  return tte;
}

module.exports = {
  createTTE
};
