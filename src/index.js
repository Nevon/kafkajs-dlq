const Consumer = require("./consumer");
const { KafkaJSDLQError } = require("./errors");

module.exports = class DLQ {
  constructor({ client }) {
    if (!client) {
      throw new KafkaJSDLQError('"client" must be an instance of KafkaJS');
    }

    this.client = client;
  }

  /**
   * {
   *   topics: {
   *     [topic]: {
   *       delayedExecution: [
   *         { topic: `${topic}.5m`, delay: 5 * 60 * 1000 },
   *         { topic: `${topic}.15m`, delay: 15 * 60 * 1000 }
   *       ],
   *       failureAdapter
   *     }
   *   },
   *   eachMessage: async ({ topic, partition, message }) => {
   *     throw new Error('Failed to process message')
   *   },
   *   producerOptions: {}, // optional
   *   producerSendOptions: {}, // optional
   * }
   *
   * @param {Object} topics
   * @param {function} [eachMessage]
   * @param {Object} [producerOptions = {}]
   * @param {Object} [producerSendOptions = {}]
   */
  consumer({
    consumer: kafkaJsConsumer,
    topics,
    eachMessage,
    producerOptions = {},
    producerSendOptions = {}
  } = {}) {
    const consumer = new Consumer({
      consumer: kafkaJsConsumer,
      client: this.client,
      topics,
      eachMessage,
      producerOptions,
      producerSendOptions
    });

    return consumer.handlers();
  }
};
