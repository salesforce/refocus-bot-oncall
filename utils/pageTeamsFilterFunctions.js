const { env } = require('../config.js');
const config = require('../config.js')[env];
const bdk = require('@salesforce/refocus-bdk')(config);

/**
 * @param {string} name - name of function where error occurred.
 * @param {any} returnValue - value to be returned after logging.
 * @returns {any} - whatever was passed as the returnsValue param.
 */
function logInvalidArgs(name, returnValue) {
  bdk.log.error(`Invalid args passed to function ${name}`);
  return returnValue;
}

/**
 * @param {Array<Incident>} incidentList - list of pager incidents that have already occurred.
 * @param {Array<Team>} teamsToPage - list of teams to autopage, from room settings.
 * @returns {Array<Team>} - list of teams from teamsToPage which have not been already paged.
 */
function removeAlreadyPagedTeams(incidentList, teamsToPage) {
  if (!incidentList || !teamsToPage?.length) return logInvalidArgs('removeAlreadyPagedTeams', []);
  const pagedTeams = incidentList.map((incident) => incident.service.id);
  return teamsToPage.filter((team) => !pagedTeams.includes(team.id));
}

/**
 * @param {Array<Team>} teams - list of teams to autopage, from room settings.
 * @param {string} severity - current severity of room.
 * @returns {Array<Team>} - array of teams which have the matching severity.
 */
function removeTeamsWithoutMatchingSeverity(teams, severity) {
  if (!teams) return logInvalidArgs('removeTeamsWithoutMatchingSeverity', []);
  teams.forEach((team) => {
    team.severities = team.severities.map((sev) => sev.toLowerCase());
  });
  return teams.filter((team) =>
    team.severities.includes(severity.toLowerCase())
  );
}

module.exports = {
  removeAlreadyPagedTeams,
  removeTeamsWithoutMatchingSeverity,
};
