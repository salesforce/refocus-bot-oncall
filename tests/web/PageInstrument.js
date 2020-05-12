import PageInstrument from '../../web/components/PageInstrument';
import { instrumentTypes } from '../../web/components/PageInstrument';
const { expect } = require('chai');
describe('web/PageInstrument.js', () => {
  it('Ok, creates an instance of PageInstrument', () => {
    const instrument = new PageInstrument(instrumentTypes.RECOMMENDATION_ADDED, 5, 3, 'IMC');
    expect(instrument).to.not.equal(null);
  });

  it('Fail, tried to create instance of PageInstrument without correct type', () => {
    try {
      const test = new PageInstrument(null, 5, 3, 'IMC');
    } catch (err) {
      expect(err.message).to.contain('Invalid Argument(s) in PageInstrument Constructor: type');
    }
  });
});
