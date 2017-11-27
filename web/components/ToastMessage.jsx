const React=require('react');
import PropTypes from 'prop-types';

class ToastMessage extends React.Component{

  constructor(props){
    super(props);
    this.state={
      message: props.message,
      show: false,
    }
    this.closeToast=this.closeToast.bind(this);
  }

  closeToast(){
    this.setState({ show: false });
    if(this.props.closed){
      this.props.closed();
    }
  }

  componentDidMount() {
    this.setState({ message: this.props.message });
    this.setState({ show: true });
  }

  componentWillReceiveProps(nextProps) {
    this.setState({ message: nextProps.message });
    this.setState({ show: true });
  }

  render(){
    const {message, show} = this.state;
    return(
      <div className={show ? "slds-is-absolute slds-size--1-of-1" : "slds-hide"}>
        <div style={{position: 'absolute', left: '0px', top: this.props.index * 50 + "px"}}>
          <div className="slds-notify slds-notify_toast slds-theme_info" role="alert">
            <div className="slds-notify__content">
              <h2 className="slds-text-heading_small">{ message }</h2>
            </div>
            <button className="slds-button slds-button_icon slds-notify__close slds-button_icon-inverse" onClick={() => this.closeToast()} title="Close">
              X
            </button>
          </div>
        </div>
      </div>
    )
  }
}

ToastMessage.propTypes={
  message: PropTypes.string,
  closed: PropTypes.func,
}

module.exports=ToastMessage;