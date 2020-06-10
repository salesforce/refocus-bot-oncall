/**
 * Copyright (c) 2018, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

const React=require('react');
import PropTypes from 'prop-types';

class ToastMessage extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      isHidden: false
    };
  }
  hide() {
    this.setState({ isHidden: true });
  }
  render() {
    const { message } = this.props;
    const { isHidden } = this.state;
    return (
      <div className={isHidden ? 'slds-hide' : ''} style={{ width: '100%' }}>
        <div className="slds-region_narrow slds-is-relative">
          <div className="slds-notify_container slds-is-absolute">
            <div className="slds-notify slds-notify_toast slds-theme_info slds-size_3-of-4">
              <div className="slds-notify__content">
                <h2 className="slds-text-heading_small">{ message }</h2>
              </div>
              <button className="slds-button slds-button_icon slds-notify__close slds-button_icon-inverse"
                onClick={() => this.hide()} title="Close">
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

export default ToastMessage;
