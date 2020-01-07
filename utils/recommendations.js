const request = require('superagent');

/**
 * Query Recommendation api for recommendations
 * @param {String} url - url of recomendation app
 * @param {Object} data - Oncall Data passed in
 * @returns {Promise} - list of recommended teams
 */
function getRecommendations(url, data) {
  const query = {
    'subject': data.caseSubject || '',
    'Priority': data.casePriority,
    'Customer Impact': data.caseCustomerImpact || ''
  };
  return new Promise((resolve, reject) => {
    request
      .post(url + '/oncall')
      .send(query)
      .set('Content-Type', 'application/json;charset=UTF-8')
      .then((res) => {
        resolve(res.body.recommended_teams);
      }).catch((error) => {
        reject(error);
      });
  });
}

module.exports = {
  getRecommendations
};

