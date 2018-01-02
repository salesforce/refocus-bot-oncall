/**
 * Copyright (c) 2017, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */
/**
 * /web/dist/public/refocusConnect.js
 *
 * This is a package to help test refocus from bots web app without
 * having to use refocus/rooms. This will find all the DB activity
 * throught sockets or polling and dispatch the appropriate JS event
 *
 */

/**
 * Get JSON from server asynchronous
 *
 * @param url {String} - URL for route
 * @returns {JSON} - Route response
 */
function genericGet(api, endPoint, options) {
    const url = createURL(api, endPoint, options);
    $.ajax({
        url: url,
        crossDomain: true,
        type: "GET",
        success: function(data) {
            createEvents(data);
        },
        dataType: "JSON",
        complete: function(data) {
            console.log('Polled ' + url);
        },
        timeout: 2000
    });
}

/**
 * Polling function that will hit the server over and over
 * to see if there is new updates to data or settings updates for
 * the UI to use. This polling can be replaced with sockets for
 * subscription based updates.
 *
 * @returns {JSON} - Route response
 */
function pollingUI(api, endPoint, options) {
    const url = createURL(api, endPoint, options);
    setInterval(function() {
        $.ajax({
            url: url,
            crossDomain: true,
            type: "GET",
            success: function(data) {
              pollingEvents(data, endPoint);
            },
            dataType: "JSON",
            complete: function(data) {
                //console.log('Polled ' + url);
            },
            timeout: 2000
        });
    }, 5000);
}

/**
 * This will take the polling raw data and dispatch Javascript
 * events
 *
 * @parameter {Object} data - the raw data from end point
 * @parameter {Object} endPoint - name of event point it uses
 * @returns null
 */
function pollingEvents(data, endPoint) {
  if(endPoint === 'events'){
    if (data.length > 0) {
      var duration = moment.duration(moment().diff(moment(data[data.length - 1].updatedAt))).asSeconds();
      if (duration < 8) {
        document.body.dispatchEvent(new CustomEvent('refocus.events', {
          detail: data,
        }));
      }
    }
  } else if (endPoint === 'botActions') {
    const actions = data.filter(action => {
      var duration = moment.duration(moment().diff(moment(action.updatedAt))).asSeconds();
      if((action.response !== undefined) && (action.response !== null) && (duration < 8)){
        return action;
      }
    });

    actions.forEach((action) => {
      document.body.dispatchEvent(new CustomEvent('refocus.bot.actions', {
        detail: action,
      }));
    });
  } else if (endPoint.includes('data')) {
    const botData = data.filter(bd => {
      var duration = moment.duration(moment().diff(moment(bd.updatedAt))).asSeconds();
      if(duration < 8){
        return bd;
      }
    });

    botData.forEach((bd) => {
      document.body.dispatchEvent(new CustomEvent('refocus.bot.data', {
        detail: bd,
      }));
    });
  } else if(endPoint.includes('rooms')) {
    var duration = moment.duration(moment().diff(moment(data.updatedAt))).asSeconds();
    if(duration < 8){
      document.body.dispatchEvent(new CustomEvent('refocus.room.settings', {
        detail: data,
      }));
    }
  }
}

/**
 * Creates the URL to query
 *
 * @parameter {String} api - the raw data from end point
 * @parameter {String} endPoint - name of event point it uses
 * @parameter {Object} options - options for url
 * @returns {String} url - Query url
 */
function createURL(api, endPoint, options){
    let url = api + endPoint + '?';
    if(options !== null){
        for (var prop in options) {
            url += prop + '=' + options[prop] + '&';
        }
    }
    return url;
}

module.exports = {
  pollingUI
};
