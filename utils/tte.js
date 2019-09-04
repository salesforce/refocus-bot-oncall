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
 * @param {String} team - team paged
 * @param {Array} pdData - list of pagerduty data
 * @returns {Object} - A tte
 */
function createTTE(team, pdData) {
  const tte = {};
  tte.startTime = pdData.body.log_entries
    .filter((entry) => entry.type === 'notify_log_entry')[ZERO]
    .created_at;
  const endTime = pdData.body.log_entries
    .filter((entry) => {
      return entry.type === 'acknowledge_log_entry' ||
       entry.type === 'resolve_log_entry';
    });
  tte.endTime = endTime[ZERO] ? endTime[ZERO].created_at : null;
  tte.team = team;
  return tte;
}

module.exports = {
  createTTE
};
