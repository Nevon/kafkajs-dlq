const createEachMessageHandler = require("./messageHandler");
const { KafkaJSDLQError, KafkaJSDLQNotImplemented } = require("../errors");

const consumer = ({
  topics,
  producer,
  consumer,
  eachMessage,
  eachBatch,
  logger = console
} = {}) => {
  if (!producer) {
    throw new KafkaJSDLQError(
      '"producer" needs to be an instance of Kafka.producer'
    );
  }

  if (!consumer) {
    throw new KafkaJSDLQError(
      '"consumer" needs to be an instance of Kafka.consumer'
    );
  }

  if (!topics) {
    throw new KafkaJSDLQError(
      '"topics" should be an object mapping between source topic and dead-letter queue'
    );
  }

  if (!eachMessage && !eachBatch) {
    throw new KafkaJSDLQError(
      'Either "eachMessage" or "eachBatch" needs to be a function'
    );
  }

  return {
    eachMessage: createEachMessageHandler({
      eachMessage,
      topics,
      producer,
      consumer,
      logger
    }),
    eachBatch: () => {
      throw new KafkaJSDLQNotImplemented('"eachBatch" is not implemented');
    }
  };
};

module.exports = consumer;
