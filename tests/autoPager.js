const {
  removeTeamsWithoutMatchingSeverity,
  removeAlreadyPagedTeams,
} = require('../utils/pageTeamsFilterFunctions.js');
const { expect } = require('chai');

describe('autoPager.js >', () => {
  const sev1Team = { name: 'team1', severities: ['Sev1'], id: 'EX5W2' };
  const sev0Team = { name: 'team2', severities: ['Sev0', 'Sev1'], id: 'TW4P1' };
  const teams = [sev0Team, sev1Team];

  describe('function removeTeamsWithoutMatchingSeverity >', () => {
    it('Should return empty array when teams is invalid', () => {
      const expectedTeamListLength = 0;
      const result = removeTeamsWithoutMatchingSeverity(null, 'sev0');
      expect(result.length).to.equal(expectedTeamListLength);
    });

    it('Should return no teams when no teams match severity', () => {
      const expectedTeamListLength = 0;
      const result = removeTeamsWithoutMatchingSeverity(teams, 'sev2');
      expect(result.length).to.equal(expectedTeamListLength);
    });

    it('Should return only Sev0 team', () => {
      const expectedTeamListLength = 1;
      const result = removeTeamsWithoutMatchingSeverity(teams, 'sev0');
      expect(result.length).to.equal(expectedTeamListLength);
      expect(result[0]).to.deep.equal(sev0Team);
    });

    it('Should return both teams when both match severity', () => {
      const expectedTeamListLength = 2;
      const result = removeTeamsWithoutMatchingSeverity(teams, 'sev1');
      expect(result.length).to.equal(expectedTeamListLength);
      expect(result).to.deep.equal(teams);
    });
  });

  describe('function removeAlreadyPagedTeams >', () => {
    const incidentOne = { id: 'i1', service: { id: 'EX5W2' } };
    const incidentTwo = { id: 'i2', service: { id: 'TW4P1' } };
    const incidentThree = { id: 'i3', service: { id: 'NOT-AUTO' } };

    it('Should return empty list when all teams have already been paged', () => {
      const testIncidentList = [incidentOne, incidentTwo];
      const expectedListLength = 0;
      const result = removeAlreadyPagedTeams(testIncidentList, teams);
      expect(result.length).to.equal(expectedListLength);
    });

    it('Should return only non paged team when one team has already been paged', () => {
      const testIncidentList = [incidentOne];
      const expectedArray = [sev0Team];
      const expectedListLength = 1;
      const result = removeAlreadyPagedTeams(testIncidentList, teams);
      expect(result.length).to.equal(expectedListLength);
      expect(result).to.deep.equal(expectedArray);
    });

    it('Should return only non paged team when one team has already been paged', () => {
      const testIncidentList = [incidentThree];
      const expectedArray = teams;
      const expectedListLength = 2;
      const result = removeAlreadyPagedTeams(testIncidentList, teams);
      expect(result.length).to.equal(expectedListLength);
      expect(result).to.deep.equal(expectedArray);
    });
  });
});
