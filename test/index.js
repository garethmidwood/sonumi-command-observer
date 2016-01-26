var chai   = require('chai'),
    sinon  = require('sinon'),
    rewire = require('rewire');

require('sinon-as-promised');

var expect = chai.expect;
var assert = chai.assert;


describe("Setup", function() {
    var observer,
        loggerMock,
        sonumiLoggerMock,
        clientMock,
        subscriptionPromise,
        commandObserver = rewire("../index");

    beforeEach(function() {
        loggerMock = sinon.stub();
        loggerMock.log = sinon.stub();
        loggerMock.addLogFile = sinon.stub();
        sonumiLoggerMock = sinon.stub();
        sonumiLoggerMock.init = sinon.stub().returns(loggerMock);

        configMock = {
            "logging": {
                "logDir": "/tmp/"
            }
        };

        commandObserver.__set__({
            config: configMock,
            logger: loggerMock,
            sonumiLogger: sonumiLoggerMock
        });

        subscriptionPromise = new Promise(function(resolve, reject) {});

        clientMock = sinon.stub();
        clientMock.observe = sinon.stub().returns({});
        clientMock.collections = function() {
            return {
                'commands': []
            };
        };

        observer = new commandObserver(clientMock);
    });

    it('should observe the collection', function() {
        assert(clientMock.observe.calledWith('commands'));
    });

    it('should register new handlers', function() {
        var label = 'test_handler';

        expect(observer.handlers[label]).to.be.undefined;

        observer.register_handler(label, {});

        expect(observer.handlers[label]).to.not.be.undefined;
    });
});


describe("Handlers", function() {
    var observer,
        loggerMock,
        sonumiLoggerMock,
        clientMock,
        commandObserver = rewire("../index");

    beforeEach(function() {
        loggerMock = sinon.stub();
        loggerMock.log = sinon.stub();
        loggerMock.error = sinon.stub();
        loggerMock.addLogFile = sinon.stub();
        sonumiLoggerMock = sinon.stub();
        sonumiLoggerMock.init = sinon.stub().returns(loggerMock);

        configMock = {
            "logging": {
                "logDir": "/tmp/"
            }
        };

        commandObserver.__set__({
            config: configMock,
            logger: loggerMock,
            sonumiLogger: sonumiLoggerMock
        });

        clientMock = sinon.stub();
        clientMock.subscribe = sinon.spy();
        clientMock.observe = sinon.stub().returns({});
        clientMock.collections = function() {
            return {
                'commands': [
                    {'text': 'my.test'},
                    {'text': 'my.test.action'}
                ]
            };
        };

        observer = new commandObserver(clientMock);
        observer.status_ack = sinon.spy();
        observer.status_fail = sinon.spy();
        observer.status_executing = sinon.spy();
        observer.status_complete = sinon.spy();
    });

    it('should reject badly formatted commands', function() {
        var commandId = 0;

        observer.status_fail = sinon.spy();

        observer.added(commandId);

        assert(observer.status_fail.calledWith(commandId));
    });

    it('should acknowledge correctly formatted commands', function() {
        var commandId = 1;

        observer.added(commandId);

        assert(observer.status_ack.calledWith(commandId));
    });

    it('should fail when no handler is found for a command', function() {
        var commandId = 1;

        observer.added(commandId);

        assert(observer.status_fail.calledWith(commandId));
    });

    it('should fail when the command handler returns a failure status', function() {
        var commandId = 1;

        var failingPromise = sinon.stub();
        failingPromise.then = function (resolve, reject) {
            reject('FAIL');
            assert(observer.status_fail.calledWith(commandId));
        };

        observer.register_handler(
            'test',
            {
                'action': sinon.stub().returns(failingPromise)
            }
        );

        observer.added(commandId);
    });

    it('should continue when the command handler returns an executing status', function() {
        var commandId = 1;

        var executingPromise = sinon.stub();
        executingPromise.then = function (resolve, reject) {
            resolve('EXECUTING');
            assert(observer.status_executing.calledWith(commandId));
        };

        observer.register_handler(
            'test',
            {
                'action': sinon.stub().returns(executingPromise)
            }
        );

        observer.added(commandId);
    });

    it('should complete when the command handler returns a complete status', function() {
        var commandId = 1;

        var completePromise = sinon.stub();
        completePromise.then = function (resolve, reject) {
            resolve('COMPLETE');
            assert(observer.status_complete.calledWith(commandId));
        };

        observer.register_handler(
            'test',
            {
                'action': sinon.stub().returns(completePromise)
            }
        );

        observer.added(commandId);
    });
});

