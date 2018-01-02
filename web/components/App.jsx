import PropTypes from 'prop-types';
import Select from 'react-select';
import 'react-select/dist/react-select.css';
const React=require('react');
const ToastMessage=require('./ToastMessage.jsx');
const botName = require('../../package.json').name;
const env = process.env.NODE_ENV || 'dev';
const config = require('../../config.js')[env];
const bdk = require('@salesforce/refocus-bdk')(config);

class App extends React.Component{

  constructor(props){
    super(props);
    this.state={
      roomId: this.props.roomId,
      response: this.props.response,
      services: this.props.services,
      removeSelected: true,
      disabled: false,
      crazy: false,
      stayOpen: true,
      value: [],
      rtl: false,
    };
    this.closeToast = this.closeToast.bind(this);
    this.pageGroup = this.pageGroup.bind(this);
    this.handleSelectChange = this.handleSelectChange.bind(this);
    this.toggleCheckbox = this.toggleCheckbox.bind(this);
    this.toggleRtl = this.toggleRtl.bind(this);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      response: nextProps.response,
      services: nextProps.services
    });

  }

  closeToast(){
    this.setState({message: ''});
  }

  handleSelectChange (value) {
    let values = value.split(',');
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
    let rtl = e.target.checked;
    this.setState({ rtl });
  }

   pageGroup(services){
      const serviceReq = {
        "name": "pagerServices",
        "botId": botName,
        "roomId": this.state.roomId,
        "isPending": true,
        "parameters": [
          {
            "name": "services",
            "value": services,
          },
          {
            "name": "message",
            "value": "Send from bot.",
          },
        ]
      };
      bdk.createBotAction(serviceReq);
    }

  render(){
    const { services } = this.state;
    const { crazy, disabled, stayOpen, value } = this.state;
    let options = [];
    Object.keys(services).forEach((key) => {
      let service = {};
      service.label = key;
      service.value = services[key];
      options.push(service);
    });

    // const options = [
    //   { label: 'Chocolate', value: 'chocolate' },
    //   { label: 'Vanilla', value: 'vanilla' },
    //   { label: 'Strawberry', value: 'strawberry' },
    //   { label: 'Caramel', value: 'caramel' },
    //   { label: 'Cookies and Cream', value: 'cookiescream' },
    //   { label: 'Peppermint', value: 'peppermint' },
    // ];

    return (
      <div className="slds-grid slds-form slds-form_stacked slds-p-horizontal_medium slds-m-bottom_small">
        <div className="slds-size_1-of-1 slds-form-element slds-col">
          <div className="slds-form-element__control">
            <Select
              closeOnSelect={!stayOpen}
              disabled={disabled}
              multi
              onChange={this.handleSelectChange}
              options={options}
              placeholder="Select Groups to Page"
              removeSelected={this.state.removeSelected}
              rtl={this.state.rtl}
              simpleValue
              value={value}
            />
          </div>
        </div>
        <div className="slds-text-align_center slds-col">
          <button
            className="slds-button slds-button_brand"
            /*onClick={() => this.pageGroup(value)}*/>
            Page
          </button>
        </div>
      </div>
    );
  }
}

App.propTypes={
  roomId: PropTypes.number,
  response: PropTypes.object,
  services: PropTypes.object,
};

module.exports=App;