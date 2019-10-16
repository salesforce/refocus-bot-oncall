/**
 * Copyright (c) 2019, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * tests/index.js
 */
/* eslint camelcase: 0 */
const expect = require('chai').expect;
const createTTE = require('../utils/tte.js').createTTE;

const testTeamData = 'TestTeam';
const testPdData = {};
testPdData.body = {};

describe('index.js >', () => {
  describe(' createTTE tests', () => {
    it('should return a single tte resolve_log_entry', () => {
      const expected = {
        id: 'ab',
        start: '2019-09-04T09:16:41Z',
        end: '2019-09-04T09:16:41Z',
        team: 'TestTeam'
      };
      testPdData.body.log_entries = [
        {
          type: 'notify_log_entry',
          created_at: '2019-09-04T09:16:41Z',
        },
        {
          type: 'resolve_log_entry',
          created_at: '2019-09-04T09:16:41Z',
        }];
      const tte = createTTE('ab', testTeamData, testPdData);
      expect(tte).to.deep.equal(expected);
    });
  });
});
