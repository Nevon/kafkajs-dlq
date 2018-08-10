const Consumer = require(".");
const { KafkaJSDLQNotImplemented, KafkaJSDLQAbortBatch } = require("../errors");
const { FailureAdapter } = require("../failureAdapters/index");

let logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

logger.namespace = () => logger;

describe("Consumer", () => {
  let client, failureAdapter, topic, onFailureMock;

  class MockFailureAdapter extends FailureAdapter {
    async onFailure(...args) {
      return onFailureMock(...args);
    }
  }

  beforeEach(() => {
    onFailureMock = jest.fn();
    topic = "failure-topic";
    failureAdapter = new MockFailureAdapter();
    client = {
      logger
    };
  });

  test("throws on invalid arguments", () => {
    const args = {
      failureAdapter,
      client,
      eachMessage: jest.fn(),
      eachBatch: jest.fn()
    };

    expect(
      () =>
        new Consumer({
          ...args,
          failureAdapter: undefined
        })
    ).toThrowError(
      '"failureAdapter" needs to be an instance of an implementation of FailureAdapter'
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
  });

  describe("eachMessage", () => {
    let eachMessage, eachMessageMock;

    beforeEach(() => {
      eachMessageMock = jest.fn();
      eachMessage = new Consumer({
        failureAdapter,
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
        topic: "source",
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
        topic: "source",
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
        failureAdapter,
        client,
        eachBatch: jest.fn()
      }).handlers().eachBatch;

      expect(() => eachBatch({})).toThrowError(KafkaJSDLQNotImplemented);
    });
  });
});
