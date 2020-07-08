import PageInstrument, { instrumentTypes } from './PageInstrument';

class PageInstrumentBuilder {
  /**
   * @param {Date} roomCreatedDate - date of room creation, used to calculate tte.
   * @param {string[]} listOfRecommendations - current list of recommendations from model.
   */
  constructor(roomCreatedDate, listOfRecommendations = []) {
    if (!roomCreatedDate) {
      console.error('Err: PageInstrumentBuilder Constructor. No roomCreatedDate supplied');
    }
    this.setRoomCreatedDate(roomCreatedDate);
    this.setListOfRecommendations(listOfRecommendations);
  }

  calculateTTe() {
    return new Date() - this.roomCreatedDate;
  }

  getRecommendationPosition(teamName) {
    return this.listOfRecommendations.indexOf(teamName);
  }

  setListOfRecommendations(newList) {
    this.listOfRecommendations = newList;
  }

  setRoomCreatedDate(roomCreatedDate) {
    this.roomCreatedDate = roomCreatedDate;
  }

  /**
   * Factory function for creating new pageInstrument
   * @param {object} options - instrument options
   * @param {string} options.type - type of instrument this will be.
   * @param {number} options.numberOfRecommendations - total recommendations made for case.
   * @param {number} options.position -  position of paged recommendation in recommendation list.
   * @param {string} options.teamName - name of paged team.
   * @param {string?} options.tte - time from room creation to page event (only for 'page' types)
   * @returns {PageInstrument|null} - new PageInstrument instance, or null if an error occurs.
   */
  createNewPageInstrument({ type, numberOfRecommendations, position, teamName, tte }) {
    try {
      const newInstrument = new PageInstrument({ type, numberOfRecommendations, position, teamName,
        tte });
      return newInstrument;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  /**
   * @param {string} teamName
   * @returns {PageInstrument} - created instrument
   */
  createRecommendationAddedInstrument(teamName) {
    const pageInstrumentOptions = {
      type: instrumentTypes.RECOMMENDATION_ADDED,
      numberOfRecommendations: this.listOfRecommendations.length,
      position: this.getRecommendationPosition(teamName),
      teamName
    };
    return this.createNewPageInstrument(pageInstrumentOptions);
  }

  /**
   * @param {string} teamName
   * @returns {PageInstrument} - created instrument
   */
  createRecommendationRemovedInstrument(teamName) {
    const pageInstrumentOptions = {
      type: instrumentTypes.RECOMMENDATION_REMOVED,
      numberOfRecommendations: this.listOfRecommendations.length,
      position: this.getRecommendationPosition(teamName),
      teamName
    };
    return this.createNewPageInstrument(pageInstrumentOptions);
  }

  /**
   * @returns {PageInstrument} - created instrument
   */
  createRecommendationPagedInstrument() {
    const pageInstrumentOptions = {
      type: instrumentTypes.RECOMMENDATION_PAGED,
      numberOfRecommendations: this.listOfRecommendations.length,
      position: -1,
      teamName: 'null',
      tte: this.calculateTTe()
    };
    return this.createNewPageInstrument(pageInstrumentOptions);
  }

  /**
   * @returns {PageInstrument} - created instrument
   */
  createDropdownPagedInstrument() {
    const pageInstrumentOptions = {
      type: instrumentTypes.DROPDOWN_SELECTION_PAGED,
      numberOfRecommendations: this.listOfRecommendations.length,
      position: -1,
      teamName: 'null',
      tte: this.calculateTTe()
    };
    return this.createNewPageInstrument(pageInstrumentOptions);
  }
}
export default PageInstrumentBuilder;
