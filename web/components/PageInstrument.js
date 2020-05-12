
export const instrumentTypes = {
  RECOMMENDATION_ADDED: 'recommendationAdded',
  RECOMMENDATION_REMOVED: 'recommendationAdded',
  RECOMMENDATION_PAGED: 'recommendationPaged',
  DROPDOWN_SELECTION_PAGED: 'dropdownSelectionPaged'
};

class PageInstrument {
  /**
   * @class
   * @param {string} type - type of instrument this will be.
   * @param {number} numberOfRecommendations
   * @param {number} position
   * @param {string} teamName
   */
  constructor(type, numberOfRecommendations, position, teamName) {

  }

  parametersAreValid(type, numberOfRecommendations, position, teamName) {
    if (!type || !numberOfRecommendations || !position || !teamName)
      throw new Error('Invalid Arguments in PageInstrument Constructor');
    const instrumentTypeValues = Object.values(instrumentTypes);
    if (!instrumentTypeValues.includes(type))
      throw new Error(`Invalid Argument(s) in PageInstrument Constructor: type ${type} should be one of ${JSON.stringify(instrumentTypeValues, null, 2)}`);
  }
}

export default PageInstrument;

