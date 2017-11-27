'use strict';

const expect = require('chai').expect;
const request = require('superagent');
const sinon = require('sinon');
const _ = require('lodash');

const install = require('../lib/install.js');
const actions = require('../package.json').metadata.actions;
const data = require('../package.json').metadata.data;
const settings = require('../package.json').metadata.settings;

const env = process.env.NODE_ENV || 'dev';
const config = require('./../config.js')[env];

// test data
let bot = {
  name: 'IlikeTacos',
  url: 'https://taco-stand.com',
  active: true, // TODO: deprecate, only Refocus server should flip this flag
  actions: actions,
  data: data,
  settings: settings
};

let updatedBot = {
  name: 'IlikeTacos',
  url: 'https://new-taco-stand.com',
  actions: { name: 'newAction', parameters: [
    { name: 'text', type: 'String'} ] },
  active: true
};

let botWithUI = {
  name: 'ICanDisplayTacos',
  url: 'https://taco-stand-with-ui.com',
  active: true, // TODO: deprecate, only Refocus server should flip this flag,
  ui: 'test/bot.zip',
  actions: actions,
  data: data,
  settings: settings
};

let updatedBotWithUI = {
  name: 'ICanDisplayTacos',
  url: 'https://new-taco-stand-with-ui.com',
  actions: [ { name: 'newAction', parameters: [
    { name: 'text', type: 'String'} ] } ],
  active: true,
  ui: 'test/bot2.zip'
};

// end of test data

describe('New Bot Installation: ', () => {

  beforeEach(() => {
    sinon.stub(install, 'installBot');
  });

  afterEach(() => {
    install.installBot.restore();
  });

  it('Ok, Bot Installed (No UI)', (done) => {

    let botWithId = _.clone(bot);
    botWithId.id = 'botId';

    install.installBot.resolves({ body: botWithId });

    install.installBot(bot)
    .then(res => {
      const installedBot = res.body;
      expect(installedBot).to.have.property('id');
      expect(installedBot.name).to.equal(bot.name);
      expect(installedBot.url).to.equal(bot.url);
      expect(installedBot.actions).to.deep.equal(bot.actions);
      done();
    })
    .catch(error => {
      done(error);
    });
  });

  it('Ok, Bot Installed (With UI)', (done) => {

    let botWithId = _.clone(botWithUI);
    botWithId.id = 'botId';
    botWithId.ui = {
      type: 'Buffer',
      data: [ 10, 30 ]
    };

    install.installBot.resolves({ body: botWithId });

    install.installBot(botWithUI)
    .then(res => {
      const installedBot = res.body;
      expect(installedBot).to.have.property('id');
      expect(installedBot).to.have.property('ui');
      expect(installedBot.name).to.equal(botWithUI.name);
      expect(installedBot.url).to.equal(botWithUI.url);
      expect(installedBot.actions).to.deep.equal(botWithUI.actions);
      done();
    })
    .catch(error => {
      done(error);
    });
  });

  it('Fail, Attempt to install the same Bot twice', (done) => {

    const error = 'duplicate';

    install.installBot.rejects(error);

    install.installBot(bot)
    .then(done)
    .catch(error => {
      if (error == 'duplicate') {
        done();
      }
      else done(error);
    });
  });
});

describe('Update Existing Bot: ', () => {

  beforeEach(() => {
    sinon.stub(install, 'installBot');
    sinon.stub(install, 'updateBot');
  });

  afterEach(() => {
    install.installBot.restore();
    install.updateBot.restore();
  });

  it('Ok, Bot Updated (No UI)', (done) => {

    install.installBot.resolves({ body: bot });
    install.updateBot.resolves({ body: updatedBot });

    install.installBot(bot)
    .then(res => {
      return install.updateBot(updatedBot)
    })
    .then(res => {
      const updatedBot = res.body;
      expect(updatedBot.name).to.equal(updatedBot.name);
      expect(updatedBot.url).to.equal(updatedBot.url);
      expect(updatedBot.actions).to.deep.equal(updatedBot.actions);
      done();
    })
    .catch(error => {
      done(error);
    });
  });

  it('Ok, Bot Updated (With UI)', (done) => {

    install.installBot.resolves({ body: botWithUI });
    install.updateBot.resolves({ body: updatedBotWithUI });

    install.installBot(botWithUI)
    .then(res => {
      return install.updateBot(updatedBotWithUI)
    })
    .then(res => {
      const updatedBot = res.body;
      expect(updatedBot.name).to.equal(updatedBotWithUI.name);
      expect(updatedBot.url).to.equal(updatedBotWithUI.url);
      expect(updatedBot.actions).to.deep.equal(updatedBotWithUI.actions);
      done();
    })
    .catch(error => {
      done(error);
    });
  });

  it('Fail, Attempt to Update a Bot that Doesnt Exist ', (done) => {

    const error = 'Error: Not Found';
    install.updateBot.rejects(error);

    const botFromTheFuture = {
      name: 'IamABotFromTheFuture',
      url: 'wrong url'
    };

    install.updateBot(botFromTheFuture)
    .then(done)
    .catch(error => {
      if (error == 'Error: Not Found') {
        done();
      }
      else done(error);
    });
  });

  it('Fail, Wrong Actions Syntax', (done) => {

    install.installBot.resolves({ body: bot });

    let updatedBotWrongActions = _.clone(updatedBot);
    updatedBotWrongActions.actions = [ { name: 'this shouldnt pass validation' } ];

    const error = 'validation error';
    install.updateBot.rejects(error);

    install.installBot(bot)
    .then(res => {
      return install.updateBot(updatedBotWrongActions)
    })
    .catch(error => {
      if (error == 'validation error') {
        done();
      }
      else done(error);
    });
  });

});
