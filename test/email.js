const expect=require("chai").expect;
const sinon=require("sinon");
const Email=require("../lib/email.js");
const sender="from@email.com";
const subject="Email Subject";
const message="This is the message in the email";
const to=["receiver@email.com", "another@email.com"];
const cc=["wantcc@email.com"];
const bcc=["wantbcc@email.com"];

describe('Create an Email Object: ', () => {

  it('Ok, email created', (done) => {
    const email=Email.create(sender, subject, message, to, cc, bcc);
    expect(email).to.have.property('from');
    expect(email).to.have.property('subject');
    expect(email).to.have.property('content');
    expect(email.from.email).to.equal(sender);
    expect(email.subject).to.equal(subject);
    expect(email.content[0].value).to.equal(message);
    done();
  });

  it('Ok, Email Personalizations Are Correct', (done) => {
    const email=Email.create(sender, subject, message, to, cc, bcc);
    const emailPref=email.personalizations[0];
    expect(emailPref).to.have.property('to');
    expect(emailPref).to.have.property('cc');
    expect(emailPref).to.have.property('bcc');

    for(let i=0; i < to.length; i++){
      expect(emailPref.to[i].email).to.equal(to[i]);
    }
    for(let i=0; i < cc.length; i++){
      expect(emailPref.cc[i].email).to.equal(cc[i]);
    }
    for(let i=0; i < bcc.length; i++){
      expect(emailPref.bcc[i].email).to.equal(bcc[i]);
    }
    done();
  });
});

describe('Send An Email: ', () => {

  beforeEach(() => {
    sinon.stub(Email.sg, 'API');
  });

  afterEach(() => {
    Email.sg.API.restore();
  });
    
  it('Ok, email will be sent!', (done) => {
    Email.sg.API.resolves({statusCode: 202});
    Email.sendEmail(sender, subject, message, to)
    .then((res) => {
      expect(res.statusCode).to.equal(202);
      done();
    })
    .catch(done);
  });

  it('Fail, no arguments defined', (done) => {
    Email.sg.API.rejects({response: {statusCode: 400}});
    Email.sendEmail()
    .then(done)
    .catch((err) => {
      expect(err.response.statusCode).to.equal(400);
      done();
    })
    .catch(done);  
  });

  it('Fail, invalid subject defined', (done) => {
    Email.sg.API.rejects({response: {statusCode: 400}});
    Email.sendEmail(sender, "", message, to)
    .then(done)
    .catch((err) => {
      expect(err.response.statusCode).to.equal(400);
      done();
    })
    .catch(done);  
  });

  it('Fail, invalid message body defined', (done) => {
    Email.sg.API.rejects({response: {statusCode: 400}});
    Email.sendEmail(sender, subject, "", to)
    .then(done)
    .catch((err) => {
      expect(err.response.statusCode).to.equal(400);
      done();
    })
    .catch(done);  
  });

  it('Fail, no recepients defined!', (done) => {
    Email.sg.API.rejects({response: {statusCode: 400}});
    Email.sendEmail(sender, subject, message, [])
    .then(done)
    .catch((err) => {
      expect(err.response.statusCode).to.equal(400);
      done();
    })
    .catch(done);  
  });

  it('Fail, invalid sender', (done) => {
    Email.sg.API.rejects({response: {statusCode: 400}});
    Email.sendEmail("", subject, message, to)
    .then(done)
    .catch((err) => {
      expect(err.response.statusCode).to.equal(400);
      done();
    })
    .catch(done);  
  });
});