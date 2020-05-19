/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

import PropTypes from 'prop-types';
import Select from 'react-select';
import './overrides.css';
import isEqual from 'lodash/isEqual';
import PageInstrumentBuilder from './PageInstrumentBuilder';
import PageInstrumentStore from './PageInstrumentStore';

const React=require('react');
const ToastMessage=require('./ToastMessage.jsx');
const botName = require('../../package.json').name;
const env = require('../../config.js').env;
const config = require('../../config.js')[env];
const bdk = require('@salesforce/refocus-bdk')(config, botName);
const ZERO = 0;

class App extends React.Component{
  constructor(props){
    super(props);

    this.state = {
      roomId: props.roomId,
      response: props.response,
      services: props.services,
      selectedTeams: [],
      rtl: false,
      message: props.message,
      waiting: false,
      incidents: props.incidents ? props.incidents : [],
      selectOpen: false,
    };

    this.closeToast = this.closeToast.bind(this);
    this.pageGroup = this.pageGroup.bind(this);
    this.handleSelectChange = this.handleSelectChange.bind(this);
    this.toggleCheckbox = this.toggleCheckbox.bind(this);
    this.toggleRtl = this.toggleRtl.bind(this);
    this.handleSelectOpen = this.handleSelectOpen.bind(this);
    this.handleSelectClose = this.handleSelectClose.bind(this);
  }

  async componentDidMount () {
    const createdDate = await this.getRoomCreatedDate();
    this.pageInstrumentBuilder = new PageInstrumentBuilder(createdDate,
      this.props.recommendations.map(({ label }) => label));
  }


  componentDidUpdate(prevProps) {
    if (this.props.response) {
      if (this.state.waiting) {
        this.setState({ response: this.props.response });
      }
      this.setState({ waiting: false });
    }

    if (prevProps.recommendations.length !== this.props.recommendations.length) {
      this.pageInstrumentBuilder
        .setListOfRecommendations(this.props.recommendations.map(({ label }) => label));
    }
  }

  closeToast(){
    this.setState({ response: null });
  }

  getRoomCreatedDate() {
    return new Promise((resolve, reject) => {
      bdk.findRoom(this.props.roomId).then((room) => {
        resolve(new Date(room.body.createdAt));
      }).catch(reject);
    });
  }

  removeTeamFromSelectedTeams (nameOfTeamToRemove) {
    const { selectedTeams } = this.state;
    const updatedSelectedTeams = selectedTeams
      .filter((team) => team.label !== nameOfTeamToRemove);
    this.setState({ selectedTeams: updatedSelectedTeams });
  }

  async handleSelectChange (value, actionType) {
    if (actionType.action === 'remove-value') {
      const removedTeamName = actionType.removedValue.label;
      this.removeTeamFromSelectedTeams(removedTeamName);
      if (actionType.removedValue.isRecommendation)
        this.instrumentRecommendationRemoved(removedTeamName);
    } else if (Array.isArray(value)) {
      this.setState({ selectedTeams: value });
    } else {
      this.setState({ selectedTeams: [value] });
    }
  }

  instrumentRecommendationRemoved (removedTeamName) {
    const removalInstrument = this.pageInstrumentBuilder
      .createRecommendationRemovedInstrument(removedTeamName);
    PageInstrumentStore.storeNewPageEvent(removalInstrument)
      .catch((err) => console.error(err));
  }

  /**
   * @param {object} selectedRecommendation
   * @param {string} selectedRecommendation.label - name of team
   * @param {string} selectedRecommendation.value - pagerDuty id of team
   */
  async handleRecommendationSelect (selectedRecommendation) {
    const currentValues = this.state.selectedTeams;
    if (!currentValues.includes(selectedRecommendation)) {
      selectedRecommendation.isRecommendation = true;
      currentValues.push(selectedRecommendation);
      this.setState({ selectedTeams: currentValues });
      const instrument = this.pageInstrumentBuilder
        .createRecommendationAddedInstrument(selectedRecommendation.label);
      PageInstrumentStore.storeNewPageEvent(instrument)
        .catch((err) => console.error(err));
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

  async handlePageButtonClick(services) {
    this.pageGroup(services);
    const servicesIncludeARecommendation = services.findIndex((service) =>
      service.isRecommendation) > -1;
    let pageEvent;
    if (servicesIncludeARecommendation) {
      pageEvent = this.pageInstrumentBuilder.createRecommendationPagedInstrument();
    } else {
      pageEvent = this.pageInstrumentBuilder.createDropdownPagedInstrument();
    }
    await PageInstrumentStore.storeNewPageEvent(pageEvent);
  }

  pageGroup(services) {
    if (services.length > ZERO) {
      const serviceReq = {
        'name': 'pagerServices',
        'botId': botName,
        'roomId': this.props.roomId,
        'isPending': true,
        'parameters': [
          {
            'name': 'services',
            'value': services,
          },
          {
            'name': 'message',
            'value': this.props.message,
          },
        ]
      };

      this.setState({
        selectedTeams: [],
        waiting: true
      });

      bdk.createBotAction(serviceReq);
    }
  }

  handleSelectOpen() {
    this.setState({ selectOpen: true });
  }

  handleSelectClose() {
    this.setState({ selectOpen: false });
  }

  render(){
    const { selectedTeams, selectOpen } = this.state;
    const { services, incidents, recommendations } = this.props;
    const options = [];
    Object.keys(services).forEach((key) => {
      const service = {};
      service.label = key;
      service.value = services[key];
      options.push(service);
    });

    const gridCSS = 'slds-grid ' +
    'slds-p-horizontal--medium slds-m-bottom_x-small';
    const titleCSS = 'slds-text-title_caps slds-border_bottom ' +
      'slds-m-around_x-small slds-p-bottom_x-small';
    const spinnerCSS = 'slds-spinner slds-spinner_medium slds-spinner_brand';

    return (
      <div>
        { (isEqual(services, {}) || this.state.waiting) ? (
          <div style={{ height: '6rem', position: 'relative' }}>
            <div className={spinnerCSS}>
              <span className="slds-assistive-text">Loading</span>
              <div className="slds-spinner__dot-a"></div>
              <div className="slds-spinner__dot-b"></div>
            </div>
          </div>
        ) : (
          <div>
            { this.state.response &&
              <ToastMessage
                message={ this.state.response.statusText }
                removeToastHandler={this.closeToast}
              />
            }
            <div className={selectOpen ? `${gridCSS} select-open` : gridCSS}>
              <div className="slds-form-element slds-col">
                <div
                  className="slds-form-element__control slds-p-around_x-small">
                  <Select
                    isMulti={true}
                    onChange={this.handleSelectChange}
                    onOpen={this.handleSelectOpen}
                    onClose={this.handleSelectClose}
                    options={options}
                    placeholder="Select Groups to Page"
                    isRtl={this.state.rtl}
                    simpleValue
                    value={selectedTeams}
                  />
                </div>
              </div>
              <div
                className="slds-text-align_center slds-p-top_x-small">
                <button
                  className="slds-button slds-button_brand"
                  onClick={() => this.handlePageButtonClick(selectedTeams)}>
                  Page
                </button>
              </div>
            </div>
            <div className={selectOpen ? `${gridCSS} select-open` : gridCSS}>
              <div className="slds-form-element">
              </div>
              {config.recommendationUrl &&
                <div className="slds-p-horizontal_small slds-size_1-of-1">
                  <div className={titleCSS}>
                    Recommendations
                  </div>
                  <div className="slds-size_1-of-1 slds-text-align_center
                   slds-docked-composer__header">
                    {recommendations.map((service) => {
                      return <li key={service.label}
                        className="slds-show--inline">
                        <button
                          className="slds-button slds-button_brand
                           slds-m-around_x-small"
                          onClick={() => {
                            this.handleRecommendationSelect(service);
                          }}>
                          {service.label}
                        </button>
                      </li>;
                    })
                    }
                  </div>
                </div>
              }
            </div>
            <div className="slds-p-horizontal_small">
              <div className={titleCSS}>
                Incident Log
              </div>
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                <ul className="slds-list--dotted">
                  {incidents.length === ZERO ?
                    <li>No PagerDuty incidents created</li> :
                    <div></div>
                  }
                  {incidents.slice(ZERO).reverse().map((incident, i) => {
                    return (
                      <li key={i}>
                        <a href={incident.incident.url}
                          target="_blank" rel="noopener noreferrer">
                          Incident #{incident.incident.number}
                        </a>:&nbsp;
                        The service&nbsp;
                        <a
                          href={incident.service.html_url}
                          rel="noopener noreferrer"
                          target="_blank">
                          {incident.service.summary}
                        </a>&nbsp;contacted&nbsp;
                        {incident.assignment.map((contact) => {
                          return (
                            <span
                              key={contact.assignee.id}>
                              <a
                                href={contact.assignee.html_url}
                                rel="noopener noreferrer"
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
        )}
      </div>
    );
  }
}

App.propTypes={
  roomId: PropTypes.number,
  response: PropTypes.object,
  services: PropTypes.object,
  message: PropTypes.string,
  recommendations: PropTypes.arrayOf(
    PropTypes.exact({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired
    })
  ).isRequired,
  incidents: PropTypes.array
};

export default App;
