const Consumer = require(".");
const { KafkaJSDLQNotImplemented, KafkaJSDLQAbortBatch } = require("../errors");
const { FailureAdapter } = require("../failureAdapters/index");

let logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn()
};

logger.namespace = () => logger;

describe("Consumer", () => {
  let client,
    failureAdapter,
    topic,
    onFailureMock,
    setupMock,
    teardownMock,
    kafkaJsConsumer;

  class MockFailureAdapter extends FailureAdapter {
    async setup() {
      return setupMock();
    }

    async teardown() {
      return teardownMock();
    }

    async onFailure(...args) {
      return onFailureMock(...args);
    }
  }

  beforeEach(() => {
    onFailureMock = jest.fn();
    setupMock = jest.fn();
    teardownMock = jest.fn();
    topic = "failure-topic";
    failureAdapter = new MockFailureAdapter();
    client = {
      logger
    };
    kafkaJsConsumer = {
      on: jest.fn(),
      events: {
        CONNECT: Symbol(),
        DISCONNECT: Symbol()
      }
    };
  });

  test("throws on invalid arguments", () => {
    const args = {
      consumer: kafkaJsConsumer,
      topics: { [topic]: { failureAdapter: failureAdapter } },
      client,
      eachMessage: jest.fn(),
      eachBatch: jest.fn()
    };

    expect(
      () =>
        new Consumer({
          ...args,
          topics: undefined
        })
    ).toThrowError(
      '"topics" needs to be a failure configuration for a source topic'
    );
    expect(
      () =>
        new Consumer({
          ...args,
          topics: {
            ...args.topics,
            "some-topic": { failureAdapter: "not a failure adapter" }
          }
        })
    ).toThrowError(
      '"failureAdapter" for topic configuration "some-topic" needs to be an instance of an implementation of FailureAdapter'
    );
    expect(
      () =>
        new Consumer({
          ...args,
          eachMessage: undefined,
          eachBatch: undefined
        })
    ).toThrowError(
      'Either "eachMessage" or "eachBatch" needs to be a function'
    );
    expect(
      () =>
        new Consumer({
          ...args,
          consumer: undefined
        })
    ).toThrowError('"consumer" needs to be an instance of KafkaJs#consumer');
  });

  it("calls lifecycle methods on failure adapters when the main consumer connects and disconnects", async () => {
    let subscriptions = {};
    const consumer = new Consumer({
      topics: { [topic]: { failureAdapter: failureAdapter } },
      client,
      eachMessage: jest.fn(),
      eachBatch: jest.fn(),
      consumer: {
        ...kafkaJsConsumer,
        on: (event, cb) => {
          subscriptions[event] = cb;
        }
      }
    });

    consumer.handlers();

    await subscriptions[kafkaJsConsumer.events.CONNECT]();
    expect(setupMock).toHaveBeenCalled();

    await subscriptions[kafkaJsConsumer.events.DISCONNECT]();
    expect(teardownMock).toHaveBeenCalled();
  });

  it("calls FailureAdapter#setup on demand if the CONNECT event was never received", async () => {
    let subscriptions = {};
    const eachMessageMock = jest.fn().mockImplementationOnce(() => {
      throw new Error("Something went wrong");
    });
    const consumer = new Consumer({
      topics: { [topic]: { failureAdapter: failureAdapter } },
      client,
      eachMessage: eachMessageMock,
      eachBatch: jest.fn(),
      consumer: {
        ...kafkaJsConsumer,
        on: (event, cb) => {
          subscriptions[event] = cb;
        }
      }
    });

    const eachMessage = consumer.handlers().eachMessage;

    await eachMessage({
      topic,
      partition: 0,
      message: {
        offset: 0,
        key: 1,
        value: "message"
      }
    });

    expect(setupMock).toHaveBeenCalled();
  });

  describe("eachMessage", () => {
    let eachMessage, eachMessageMock, sourceTopic;

    beforeEach(() => {
      sourceTopic = "source";
      eachMessageMock = jest.fn();
      eachMessage = new Consumer({
        consumer: kafkaJsConsumer,
        topics: { [sourceTopic]: { failureAdapter } },
        client,
        eachMessage: eachMessageMock
      }).handlers().eachMessage;
    });

    it('calls the provided "eachMessage"', async () => {
      const args = {
        topic: "source",
        partition: 0,
        message: {
          offset: 0,
          key: 1,
          value: "message"
        }
      };
      await eachMessage(args);

      expect(eachMessageMock).toHaveBeenCalledWith(args);
    });

    it('passes the message to the failure adapter when "eachMessage" throws', async () => {
      const args = {
        topic: sourceTopic,
        partition: 0,
        message: {
          offset: 0,
          key: 1,
          value: "message"
        }
      };
      eachMessageMock.mockImplementationOnce(() => {
        throw new Error("Something went wrong");
      });

      await eachMessage(args);

      expect(onFailureMock).toHaveBeenCalledWith(args);
    });

    it("throws a KafkaJSDLQAbortBatch error when the failure adapter fails", async () => {
      const args = {
        topic: sourceTopic,
        partition: 0,
        message: {
          offset: 0,
          key: 1,
          value: "message"
        }
      };
      eachMessageMock.mockImplementationOnce(() => {
        throw new Error("Something went wrong");
      });
      onFailureMock.mockImplementationOnce(() => {
        throw new Error("Failure handler failed");
      });

      await expect(eachMessage(args)).rejects.toThrowError(
        KafkaJSDLQAbortBatch
      );
    });
  });

  describe("eachBatch", () => {
    it("throws a KafkaJSDLQNotImplemented error", () => {
      const eachBatch = new Consumer({
        consumer: kafkaJsConsumer,
        topics: {},
        client,
        eachBatch: jest.fn()
      }).handlers().eachBatch;

      expect(() => eachBatch({})).toThrowError(KafkaJSDLQNotImplemented);
    });
  });
});
