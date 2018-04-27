const React=require('react');
import PropTypes from 'prop-types';
const TIMEOUT = 3000; // ms

class ToastMessage extends React.Component{
  constructor(props){
    super(props);
    this.state={
      message: props.message,
      show: false,
    };
    this.closeToast=this.closeToast.bind(this);
  }

  closeToast(){
    if (this.props.removeToastHandler) {
      this.setState({ show: false });
      this.props.removeToastHandler();
    }
  }

  componentDidMount() {
    this.setState({ message: this.props.message });
    this.setState({ show: true });
    this.interval = setInterval(() => this.closeToast(), TIMEOUT);
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ message: nextProps.message });
    this.setState({ show: true });
  }

  render(){
    const { message, show } = this.state;
    return (
      <div className={show ? '' : 'slds-hide'} style={{ width: '100%' }}>
        <div className="slds-region_narrow slds-is-relative">
          <div className="slds-notify_container slds-is-absolute">
            <div className="slds-notify slds-notify_toast slds-theme_info slds-size_3-of-4">
              <div className="slds-notify__content">
                <h2 className="slds-text-heading_small">{ message }</h2>
              </div>
              <button className="slds-button slds-button_icon slds-notify__close slds-button_icon-inverse" onClick={() => this.closeToast()} title="Close">
                X
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

ToastMessage.propTypes={
  message: PropTypes.string,
  removeToastHandler: PropTypes.func,
};

module.exports=ToastMessage;
