var expect = require('chai').expect,
    assert = require('chai').assert,
    sinon  = require('sinon'),
    rewire = require('rewire');


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



describe("Observe Commands", function() {
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
            sonumiLogger: sonumiLoggerMock,
            execute: sinon.spy()
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
    });

    it('should reject badly formatted commands', function() {
        var commandId = 0;

        observer.status_fail = sinon.spy();

        observer.added(commandId);

        assert(observer.status_fail.calledWith(commandId));
    });

    it('should acknowledge and execute new commands', function() {
        var commandId = 1;

        observer.status_ack = sinon.spy();

        observer.added(commandId);

        assert(observer.status_ack.calledWith(commandId));
        assert(commandObserver.__get__('execute').calledWith(commandId, 'my', 'test', 'action'));
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
    });

    it('should acknowledge and fail when no handler is found for a command', function() {
        var commandId = 1;

        observer.status_fail = sinon.spy();

        observer.added(commandId);

        assert(observer.status_ack.calledWith(commandId));
        assert(observer.status_fail.calledWith(commandId));
    });

    it('should acknowledge and fail when the command handler returns a failure status', function() {
        var commandId = 1;

        observer.status_fail = sinon.spy();

        observer.register_handler('test', {'action': sinon.stub().callsArgWith(0, 'FAIL') });

        observer.added(commandId);

        assert(observer.status_ack.calledWith(commandId));
        assert(observer.status_fail.calledWith(commandId));
    });

    it('should acknowledge and continue when the command handler returns an executing status', function() {
        var commandId = 1;

        observer.status_executing = sinon.spy();

        observer.register_handler('test', {'action': sinon.stub().callsArgWith(0, 'EXECUTING') });

        observer.added(commandId);

        assert(observer.status_ack.calledWith(commandId));
        assert(observer.status_executing.calledWith(commandId));
    });

    it('should acknowledge and complete when the command handler returns a complete status', function() {
        var commandId = 1;

        observer.status_complete = sinon.spy();

        observer.register_handler('test', {'action': sinon.stub().callsArgWith(0, 'COMPLETE') });

        observer.added(commandId);

        assert(observer.status_ack.calledWith(commandId));
        assert(observer.status_complete.calledWith(commandId));
    });
});

