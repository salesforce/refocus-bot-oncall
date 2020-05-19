export const instrumentTypes = {
  RECOMMENDATION_ADDED: 'recommendationAdded',
  RECOMMENDATION_REMOVED: 'recommendationRemoved',
  RECOMMENDATION_PAGED: 'recommendationPaged',
  DROPDOWN_SELECTION_PAGED: 'dropdownSelectionPaged'
};

class PageInstrument {
  /**
   * @class
   * @param {object} options - instrument options
   * @param {string} options.type - type of instrument this will be.
   * @param {number} options.numberOfRecommendations - total recommendations made for case.
   * @param {number} options.position -  position of paged recommendation in recommendation list.
   * @param {string} options.teamName - name of paged team.
   * @param {string?} options.tte - time from room creation to page event (only for 'page' types)
   */
  constructor({ type, numberOfRecommendations, position, teamName, tte }) {
    this.parametersAreValid({ type, numberOfRecommendations, position, teamName, tte });
    this.type = type;
    this.numberOfRecommendations = numberOfRecommendations;
    this.position = position;
    this.teamName = teamName;
    this.tte = tte;
  }

  /**
   * Check if parameters supplied to constructor are valid.
   * @param {object} options - instrument options
   * @param {string} options.type - type of instrument this will be.
   * @param {number} options.numberOfRecommendations - total recommendations made for case.
   * @param {number} options.position -  position of paged recommendation in recommendation list.
   * @param {string} options.teamName - name of paged team.
   * @param {string?} options.tte - time from room creation to page event (only for 'page' types)
   */
  parametersAreValid({ type, numberOfRecommendations, position, teamName, tte }) {
    const instrumentTypeValues = Object.values(instrumentTypes);
    if (!type || typeof numberOfRecommendations !== 'number' ||
        typeof position !== 'number' || !teamName)
      throw new Error('Invalid Argument(s) in PageInstrument Constructor');

    if (!instrumentTypeValues.includes(type))
      throw new Error(`Invalid Argument(s) in PageInstrument Constructor: type ${type} ` +
        `should be one of ${JSON.stringify(instrumentTypeValues, null, 2)}`);

    if (position < -1 || position >= numberOfRecommendations)
      throw new Error(`Invalid Argument(s) in PageInstrument Constructor: position is ${position}` +
        `. It must be between -1 and ${numberOfRecommendations}`);

    if (type === instrumentTypes.RECOMMENDATION_PAGED ||
        type === instrumentTypes.DROPDOWN_SELECTION_PAGED) {
      if (!tte || typeof tte !== 'number')
        throw new Error(`Invalid Argument(s) in PageInstrument Constructor: tte is ${tte}. ` +
        `tte is required when creating instrument of type ${type}`);
    }
  }

  /**
   * @returns {string} - stringified object of instrument
   */
  toString() {
    const { type, numberOfRecommendations, position, teamName, tte } = this;
    return JSON.stringify({
      type,
      numberOfRecommendations,
      position,
      teamName,
      tte
    });
  }
}

export default PageInstrument;

