/* eslint-disable no-unused-vars */
import PageInstrument from '../../web/components/PageInstrument';
import { instrumentTypes } from '../../web/components/PageInstrument';

const { expect } = require('chai');
const validNumberOfRecommendations = 5;
const validPosition = 3;
const validType = instrumentTypes.RECOMMENDATION_ADDED;
const validPageType = instrumentTypes.RECOMMENDATION_PAGED;
const testTeam = 'IMC';
const testTTe = 1240;

describe('web/PageInstrument.js >', () => {
  describe('constructor >', () => {
    it('Fail, tried to create instance of PageInstrument without correct type', () => {
      let errorMessage = null;
      const expectedErrorMessage = 'Invalid Argument(s) in PageInstrument Constructor: type';
      try {
        const testPageInstrument =
          new PageInstrument({
            type: 'fake',
            numberOfRecommendations: validNumberOfRecommendations,
            position: validPosition,
            teamName: 'IMC'
          });
      } catch (err) {
        errorMessage = err.message;
      }
      expect(errorMessage).to.not.equal(null);
      expect(typeof errorMessage).to.equal('string');
      expect(errorMessage).to.contain(expectedErrorMessage);
    });

    it('Fail, tried to create instance of PageInstrument with 0 participants', () => {
      let errorMessage = null;
      const expectedErrorMessage = 'Invalid Argument(s) in PageInstrument Constructor: position';
      try {
        const testPageInstrument =
          new PageInstrument({
            type: validType,
            numberOfRecommendations: 0,
            position: 0,
            teamName: 'IMC' });
      } catch (err) {
        errorMessage = err.message;
      }
      expect(errorMessage).to.not.equal(null);
      expect(typeof errorMessage).to.equal('string');
      expect(errorMessage).to.contain(expectedErrorMessage);
    });

    it('Fail, tried to create instance of PageInstrument with invalid position', () => {
      let errorMessage = null;
      const expectedErrorMessage = 'Invalid Argument(s) in PageInstrument Constructor: position';
      try {
        const testPageInstrument =
          new PageInstrument({
            type: validType,
            numberOfRecommendations: 5,
            position: 10,
            teamName: 'IMC'
          });
      } catch (err) {
        errorMessage = err.message;
      }
      expect(errorMessage).to.not.equal(null);
      expect(typeof errorMessage).to.equal('string');
      expect(errorMessage).to.contain(expectedErrorMessage);
    });

    it('Fail, tried to create instance of PageInstrument without a team name', () => {
      let errorMessage = null;
      const expectedErrorMessage = 'Invalid Argument(s) in PageInstrument Constructor';
      try {
        const testPageInstrument =
          new PageInstrument({
            type: validType,
            numberOfRecommendations: validNumberOfRecommendations,
            position: validPosition
          });
      } catch (err) {
        errorMessage = err.message;
      }
      expect(errorMessage).to.not.equal(null);
      expect(typeof errorMessage).to.equal('string');
      expect(errorMessage).to.contain(expectedErrorMessage);
    });

    it('Fail, trying to create instance of PageInstrument of type `paged` without tte.', () => {
      let errorMessage = null;
      const expectedErrorMessage = 'Invalid Argument(s) in PageInstrument Constructor: tte';
      try {
        const testPageInstrument = new PageInstrument({
          type: validPageType,
          numberOfRecommendations: validNumberOfRecommendations,
          position: validPosition,
          teamName: testTeam
        });
      } catch (err) {
        errorMessage = err.message;
      }
      expect(errorMessage).to.not.equal(null);
      expect(typeof errorMessage).to.equal('string');
      expect(errorMessage).to.contain(expectedErrorMessage);
    });
  });

  describe('toString >', () => {
    it('Ok, returns JSON string with supplied parameters', () => {
      const expectedOutputString = JSON.stringify({
        type: validType,
        numberOfRecommendations: validNumberOfRecommendations,
        position: validPosition,
        teamName: testTeam
      });
      const pageInstrument = new PageInstrument({
        type: validType,
        numberOfRecommendations: validNumberOfRecommendations,
        position: validPosition,
        teamName: testTeam
      });
      expect(pageInstrument.toString()).to.equal(expectedOutputString);
    });
  });
});
