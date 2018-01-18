import PropTypes from 'prop-types';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
const _ = require('lodash');
const React=require('react');
const ToastMessage=require('./ToastMessage.jsx');
const botName = require('../../package.json').name;
const env = process.env.NODE_ENV || 'dev';
const config = require('../../config.js')[env];
const bdk = require('@salesforce/refocus-bdk')(config);
const ZERO = 0;

class App extends React.Component{
  constructor(props){
    super(props);

    this.state = {
      roomId: props.roomId,
      response: props.response,
      services: props.services,
      value: [],
      rtl: false,
      message: props.message,
      waiting: false,
      incidents: props.incidents ? props.incidents : [],
    };

    this.closeToast = this.closeToast.bind(this);
    this.pageGroup = this.pageGroup.bind(this);
    this.handleSelectChange = this.handleSelectChange.bind(this);
    this.toggleCheckbox = this.toggleCheckbox.bind(this);
    this.toggleRtl = this.toggleRtl.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      services: nextProps.services,
    });
    this.setState({
      incidents: nextProps.incidents ?
        nextProps.incidents :
        this.state.incidents,
    });

    if (nextProps.response) {
      this.setState({ waiting: false });
      if (this.state.waiting) {
        this.setState({ response: nextProps.response });
      }
    }
  }

  closeToast(){
    this.setState({ response: null });
  }

  handleSelectChange (value) {
    const values = value.split(',');
    if (Array.isArray(values)) {
      this.setState({ value: values });
    } else {
      this.setState({ value: [values] });
    }
  }

  toggleCheckbox (e) {
    this.setState({
      [e.target.name]: e.target.checked,
    });
  }

  toggleRtl (e) {
    const rtl = e.target.checked;
    this.setState({ rtl });
  }

  pageGroup(services) {
    if (services.length > ZERO) {
      const serviceReq = {
        'name': 'pagerServices',
        'botId': botName,
        'roomId': this.state.roomId,
        'isPending': true,
        'parameters': [
          {
            'name': 'services',
            'value': services,
          },
          {
            'name': 'message',
            'value': this.state.message,
          },
        ]
      };

      this.setState({
        value: [],
        waiting: true
      });

      bdk.createBotAction(serviceReq);
    }
  }

  render(){
    const { services, value, incidents } = this.state;
    const options = [];
    Object.keys(services).forEach((key) => {
      const service = {};
      service.label = key;
      service.value = services[key];
      options.push(service);
    });

    const gridCSS = 'slds-grid slds-form slds-form_stacked ' +
    'slds-p-horizontal_medium slds-m-bottom_x-small';
    const titleCSS = 'slds-text-title_caps slds-border_bottom ' +
      'slds-m-around_x-small slds-p-bottom_x-small';

    return (
      <div>
        { (_.isEqual(services, {}) || this.state.waiting) ? (
          <div
            role="status"
            style={{ position: 'relative', top: '50px' }}
            className="slds-spinner slds-spinner--large slds-spinner--brand">
            <span className="slds-assistive-text">Loading</span>
            <div className="slds-spinner__dot-a"></div>
            <div className="slds-spinner__dot-b"></div>
          </div>
        ) : (
          <div>
            { this.state.response &&
              <ToastMessage
                message={ this.state.response.statusText }
                removeToastHandler={this.closeToast}
              />
            }
            <div className={gridCSS}>
              <div className="slds-size_1-of-1 slds-form-element slds-col">
                <div
                  className="slds-form-element__control slds-p-around_x-small">
                  <Select
                    multi
                    onChange={this.handleSelectChange}
                    options={options}
                    placeholder="Select Groups to Page"
                    rtl={this.state.rtl}
                    simpleValue
                    value={value}
                  />
                </div>
              </div>
              <div
                className="slds-text-align_center slds-col slds-p-top_x-small">
                <button
                  className="slds-button slds-button_brand"
                  onClick={() => this.pageGroup(value)}>
                  Page
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="slds-p-horizontal_small">
          <div className={titleCSS}>
            Incident Log
          </div>
          <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
            <ul className="slds-list--dotted">
              {incidents.slice(0).reverse().map((incident, i) => {
                return (
                  <li key={i}>
                    <a href={incident.incident.url} target="_blank">
                      Incident #{incident.incident.number}
                    </a>:&nbsp;
                    The service&nbsp;
                    <a
                      href={incident.service.html_url}
                      target="_blank">
                      {incident.service.summary}
                    </a>&nbsp;contacted&nbsp;
                    {incident.assignment.map((contact) => {
                      return (
                        <span
                          key={contact.assignee.id}>
                          <a
                            href={contact.assignee.html_url}
                            target="_blank">
                            {contact.assignee.summary}
                          </a>
                          &nbsp;
                        </span>
                      );
                    })}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    );
  }
}

App.propTypes={
  roomId: PropTypes.number,
  response: PropTypes.object,
  services: PropTypes.object,
  message: PropTypes.string,
  incidents: PropTypes.array
};

module.exports=App;
