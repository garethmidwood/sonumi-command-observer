var extend = require('extend');
var config = require('config');
var sonumiLogger = require('sonumi-logger');

var apiClient,
    logger,
    deviceManager;

function Observer(dependencies)
{
    if (!dependencies || !dependencies.devicemanager) {
        throw new Error('Device manager dependency is required');
    } else if (!dependencies.client) {
        throw new Error('API client dependency is required');
    } else {
        deviceManager = dependencies.devicemanager;
        apiClient = dependencies.client;
    }

    var logDirectory = config.logging.logDir;
    logger = sonumiLogger.init(logDirectory);
    logger.addLogFile('info', logDirectory + '/command-observer-info.log', 'info');
    logger.addLogFile('errors', logDirectory + '/command-observer-error.log', 'error');

    var self = this;

    apiClient.subscribe('pub_commands').then(
        function() {
            var observer = apiClient.observe('commands');
            extend(observer, self);
        },
        function() {
            throw new Error('API Client failed to subscribe to commands');
        }
    );
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

        logger.log('[ADDED] command with id ' + _id);

        deviceManager.trigger(_id, command);
    },
    changed: function changed(_id, oldFields, clearedFields, newFields) {
        logger.log('[CHANGED] old field values: ' + JSON.stringify(oldFields));
        logger.log('[CHANGED] cleared fields: ' + JSON.stringify(clearedFields));
        logger.log('[CHANGED] new fields: ' + JSON.stringify(newFields));
    },
    removed: function removed(_id, oldValue) {
        logger.log('[REMOVED] ' + JSON.stringify(oldValue));
    },
    status_ack: function(id) {
        apiClient.call(
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
        apiClient.call(
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
        apiClient.call(
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
        apiClient.call(
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


function retrieveCommandFromCollection(id) {
    var collections = apiClient.collections();

    return collections.commands[id];
}


module.exports = Observer;