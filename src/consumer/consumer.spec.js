const { consumer } = require("../../");
const { KafkaJSDLQNotImplemented, KafkaJSDLQAbortBatch } = require("../errors");

describe("Consumer", () => {
  let sendMock, seekMock;

  beforeEach(() => {
    sendMock = jest.fn();
    seekMock = jest.fn();
    kafkaProducer = { send: sendMock };
    kafkaConsumer = { seek: seekMock };
  });

  test("throws on invalid arguments", () => {
    const args = {
      topics: {
        source: "destination"
      },
      producer: kafkaProducer,
      consumer: kafkaConsumer,
      eachMessage: jest.fn(),
      eachBatch: jest.fn()
    };

    expect(() =>
      consumer({
        ...args,
        topics: undefined
      })
    ).toThrowError(
      '"topics" should be an object mapping between source topic and dead-letter queue'
    );
    expect(() =>
      consumer({
        ...args,
        producer: undefined
      })
    ).toThrowError('"producer" needs to be an instance of Kafka.producer');
    expect(() =>
      consumer({
        ...args,
        consumer: undefined
      })
    ).toThrowError('"consumer" needs to be an instance of Kafka.consumer');
    expect(() =>
      consumer({
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
      eachMessage = consumer({
        topics: { source: "destination" },
        producer: kafkaProducer,
        consumer: kafkaConsumer,
        eachMessage: eachMessageMock
      }).eachMessage;
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

    describe('when "eachMessage" throws', () => {
      it("rethrows if there is no corresponding dead-letter queue", async () => {
        const args = {
          topic: "other-topic",
          partition: 0,
          message: {
            offset: 0,
            key: 1,
            value: "message"
          }
        };
        const error = new Error("Something went wrong");
        eachMessageMock.mockImplementationOnce(() => {
          throw error;
        });

        await expect(eachMessage(args)).rejects.toThrowError(error);
      });

      it("sends the message to the configured dead-letter queue", async () => {
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

        expect(kafkaProducer.send).toHaveBeenCalledWith({
          topic: "destination",
          messages: [args.message]
        });
      });

      it("throws a KafkaJSDLQAbortBatch error when sending to the dead-letter queue fails", async () => {
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
        kafkaProducer.send.mockImplementationOnce(() => {
          throw new Error("Failed to send to dead-letter queue");
        });

        await expect(eachMessage(args)).rejects.toThrowError(
          KafkaJSDLQAbortBatch
        );
      });
    });
  });

  describe("eachBatch", () => {
    it("throws a KafkaJSDLQNotImplemented error", () => {
      const { eachBatch } = consumer({
        topics: { source: "destination" },
        producer: kafkaProducer,
        consumer: kafkaConsumer,
        eachBatch: jest.fn()
      });

      expect(() => eachBatch({})).toThrowError(KafkaJSDLQNotImplemented);
    });
  });
});
