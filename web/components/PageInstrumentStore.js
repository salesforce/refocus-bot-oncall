const botName = require('../../package.json').name;
const env = require('../../config.js').env;
const config = require('../../config.js')[env];
const bdk = require('@salesforce/refocus-bdk')(config, botName);
const roomId = window.location.pathname.split('rooms/')[1];

class PageInstrumentStore {
  /**
   * @param {PageInstrument} instrument - pageinstrument object to store
   * @returns {Promise} - resolves the new list of page instruments
   */
  static async storeNewPageEvent (instrument) {
    if (!instrument) return null;
    const instrumentString = instrument.toString();
    const storedEventsBotData = await bdk
      .getBotData(roomId, botName, 'onCallPagerEvents')
      .catch((err) => bdk.log.error(err));
    const storedEventList = storedEventsBotData?.body?.[0]?.value;
    let dataToUpsert = null;
    if (storedEventList) {
      dataToUpsert = JSON.parse(storedEventList);
      dataToUpsert.push(instrumentString);
    } else {
      dataToUpsert = [instrumentString];
    }
    await bdk.upsertBotData(roomId, botName, 'onCallPagerEvents', dataToUpsert)
      .catch((err) => bdk.log.error(err));
    return dataToUpsert;
  }
}

export default PageInstrumentStore;
