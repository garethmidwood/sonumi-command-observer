var extend = require('extend');
var config = require('config');
var sonumiLogger = require('sonumi-logger');

const RESPONSE_EXECUTING = 'EXECUTING';
const RESPONSE_COMPLETE = 'COMPLETE';
const RESPONSE_FAIL = 'FAIL';

var connector,
    logger;

function Observer(sonumiConnector)
{
    var logDirectory = config.logging.logDir;
    logger = sonumiLogger.init(logDirectory);
    logger.addLogFile('info', logDirectory + '/command-observer-info.log', 'info');
    logger.addLogFile('errors', logDirectory + '/command-observer-error.log', 'error');

    connector = sonumiConnector;

    // observe the publication
    var observer = connector.observe('commands');

    extend(observer, this);

    // return the extended observer
    return observer;
}

Observer.prototype = {
    handlers: {},
    register_handler: function(label, handler) {
        logger.log('Registering ' + label + ' command handler');
        this.handlers[label] = handler;
    },
    // run when a command is added
    added: function(_id) {
        var command = retrieveCommandFromCollection(_id);

        logger.log('[ADDED] ' + command + ' [' + _id + ']');

        var commandParts = command.text.split('.');

        // make sure we have the correct number of parts for the command
        if (commandParts.length != 3) {
            logger.error('[ADDED] Incorrect number of parameters in command: ' + command + ' [' + _id + ']');
            this.status_fail(_id);
            return;
        }

        var device  = commandParts[0];
        var handler = commandParts[1];
        var action  = commandParts[2];

        // acknowledge receipt of command
        this.status_ack(_id);

        execute.call(this, _id, device, handler, action);
    },
    changed: function changed(id, oldFields, clearedFields, newFields) {
        logger.log('[CHANGED] old field values: ' + JSON.stringify(oldFields));
        logger.log('[CHANGED] cleared fields: ' + JSON.stringify(clearedFields));
        logger.log('[CHANGED] new fields: ' + JSON.stringify(newFields));
    },
    removed: function removed(id, oldValue) {
        logger.log('[REMOVED] ' + JSON.stringify(oldValue));
    },


    status_ack: function(id) {
        connector.call(
            'acknowledgeCommand',
            [id],
            function (err, result) {
                if (err) {
                    logger.error(
                        'Error acknowledging command ID ' + id + ' message: ' + JSON.stringify(err)
                    );
                }
            }
        );
    },
    status_complete: function(id) {
        connector.call(
            'successCommand',
            [id],
            function (err, result) {
                if (err) {
                    logger.error(
                        'Error completing command ID ' + id + ' message: ' + JSON.stringify(err)
                    );
                }
            }
        );
    },
    status_executing: function(id) {
        connector.call(
            'alreadyRunningCommand',
            [id],
            function (err, result) {
                if (err) {
                    logger.error(
                        'Error completing already running command ID ' + id + ' message: ' + JSON.stringify(err)
                    );
                }
            }
        );
    },
    status_fail: function(id) {
        connector.call(
            'failedCommand',
            [id],
            function (err, result) {
                if (err) {
                    logger.error(
                        'Error logging failure to process command ID ' + id + ' message: ' + JSON.stringify(err)
                    );
                }
            }
        );
    }
};


function execute(_id, device, handler, action) {
    switch (device) {
        case 'sonumi':
            // TODO: store list of connected devices in Mongo
            // connected devices should automatically update on the server
            // with this mongo collection.
            // this 'sonumi' case should be used for setting up schedules
            logger.log('requested connected devices list');
            this.status_complete(_id);
            break;
        default:
            var self = this;
            // run command if handler/action exist
            if (self.handlers[handler] && self.handlers[handler][action]) {
                var executionPromise = self.handlers[handler][action]();

                executionPromise.then(
                    function (response) {
                        switch (response) {
                            case RESPONSE_EXECUTING:
                                self.status_executing(_id);
                                break;
                            case RESPONSE_COMPLETE:
                                self.status_complete(_id);
                                break;
                            case RESPONSE_FAIL:
                            default:
                                self.status_fail(_id);
                                break;
                        }
                    },
                    function(error) {
                        self.status_fail(_id);
                    }
                );
            } else {
                self.status_fail(_id);
            }
            break;
    }
}

function retrieveCommandFromCollection(id) {
    var collections = connector.collections();

    return collections.commands[id];
}


module.exports = Observer;