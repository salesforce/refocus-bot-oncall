# Oncall-Bot

[![Build Status](https://travis-ci.org/salesforce/refocus-bot-oncall.svg?branch=master)](https://travis-ci.org/salesforce/refocus-bot-oncall.svg)

This is the repository for a bot that enables Site Reliability to reach out to Service Matter Experts (SMEs) during incidents. Our users need a way to contact people from Rooms who are on-call during incidents. It was designed and developed to be used inside & in conjunction with [Refocus Rooms](https://github.com/salesforce/refocus).

## Features

* Ability to search escalation policies (https://support.pagerduty.com/v1/docs/escalation-policies).
* Ability to select one or multiple escalation policies.
* 1-button paging feature of selected escalation policies.
* Notification message text is configurable.

## Getting Started

These instructions will enable you to have a copy of this project up and running on your local machine for development and testing purposes.

### Prerequisites

* [Node.js](https://nodejs.org/en/)

### Environment variables

Note: If you want to test this locally you will need some environment variables:
* ```API_TOKEN``` - Used for Requests to Refocus. Created in refocus/tokens/new.
* ```NODE_ENV (defaults to 'dev')``` - Used to determine which instance of Refocus to install the bot.
* ```PD_TOKEN``` - Used to connect to PagerDuty.
* ```PD_SENDER``` - The email address of the sender.
* ```REFOCUS_URL``` (OPTIONAL) - Used to specify which refocus instance to point to.
* ```REFOCUS_REALTIME_URL``` (OPTIONAL) - Used to specify which refocus realtime instance to point to.

### Running Locally
* Clone this repo
* ```npm install```
* ```npm start```
* Test locally (default port 5000)

## Refocus Room Settings
* onCallBotTemplate (optional) - Template for PagerDuty notification message.
* onCallBotData (optional) - Variables to be used in template (variable ```imcLink``` is by default available in templates).

### Example Room Settings

```javascript
"settings": {
	"onCallBotTemplate": "You've been paged by {{name}} to join an incident room.",
	"onCallBotData": {
		"name": "John"
	}
}
```

### Running Tests
While creating some aspects of this project we used Test Driven Developement (TDD). Invoking "npm test" from the command line will run all of these test scripts to ensure everything is working correctly.


## Contributing
If you have any ideas on how this project could be improved, please feel free. The steps involved are:
* Fork the repo on GitHub.
* Clone this project to your machine.
* Commit changes to your own branch.
* Push your work back up to your fork.
* Submit a Pull Request so we can review it!

## Release History
Follows [semantic versioning](https://docs.npmjs.com/getting-started/semantic-versioning#semver-for-publishers)
* 1.0.0 Can notify groups via PagerDuty.
* 1.0.1 Removed reference to refocusConnect.
* 1.0.2 Fixed vertical scroll issue inherited from iframes.
* 1.0.3 Updating message when botData is updated.
* 1.0.4 Expire toast after 3 seconds and make toast width 75%.
* 1.0.5 Update server code to match scaffold
* 1.0.6 Remove extra scripts
* 1.0.7 Use Serialize instead of JSON.stringify.
* 1.0.8 Add env variable for refocus url
* 1.0.9 Fix uglify for production
* 1.0.10 Display name
* 1.0.11 Checking that Service.name exists
* 1.0.12 Multiple requests bug
* 1.0.13 Fixing bug with disabled services
* 1.0.14 New token workflow.
* 1.0.15 Clean up config.js.
* 1.0.16 Update dependencies from npm audit.
* 1.0.17 Added refocus realtime url.
* 1.0.18 Added check for a service before trying to access name.
* 1.1.0  Gets Data for acknowledgment of pages for metrics.
* 1.1.1 Fixed erroring from using .end
* 1.1.2 Adding value as object
* 1.1.3 Make single call for services rather than every page load
* 1.1.4 Update TTe attributes for TTx metrics
* 1.1.5 End time TTe should be resolve not acknowledge
* 1.2.0 Adding recommendation services
* 1.2.1 refactoring to remove some extra ifs
* 1.2.2 Updated frontend bdk instantiations for realtime app.
* 1.2.3 Added instrumentation for recommendation model training.
* 1.2.4 TTE definition changed. TTE ends when PD is acknowledged or resolved.