const createEachMessageHandler = require("./messageHandler");
const { KafkaJSDLQError, KafkaJSDLQNotImplemented } = require("../errors");
const FailureAdapter = require("../failureAdapters/adapter");

const NAMESPACE = "KafkaJSDLQ";

const createLogger = client => {
  const rootLogger =
    (typeof client.logger === "function" && client.logger()) || client.logger;

  return rootLogger.namespace(NAMESPACE);
};

module.exports = class Consumer {
  constructor({ client, topics, eachMessage, eachBatch } = {}) {
    if (!eachMessage && !eachBatch) {
      throw new KafkaJSDLQError(
        'Either "eachMessage" or "eachBatch" needs to be a function'
      );
    }

    if (!topics) {
      throw new KafkaJSDLQError(
        '"topics" needs to be a failure configuration for a source topic'
      );
    }

    for (let topic of Object.keys(topics)) {
      const { failureAdapter } = topics[topic] || {};

      if (!failureAdapter || !(failureAdapter instanceof FailureAdapter)) {
        throw new KafkaJSDLQError(
          `"failureAdapter" for topic configuration "${topic}" needs to be an instance of an implementation of ${
            FailureAdapter.name
          }`
        );
      }
    }

    this.client = client;
    this.topics = topics;
    this.eachMessage = eachMessage;
    this.eachBatch = eachBatch;
    this.logger = createLogger(client);
  }

  handlers() {
    const eachMessage = createEachMessageHandler({
      eachMessage: this.eachMessage,
      topics: this.topics,
      logger: this.logger
    });

    return {
      eachMessage,
      eachBatch: () => {
        throw new KafkaJSDLQNotImplemented('"eachBatch" is not implemented');
      }
    };
  }
};
