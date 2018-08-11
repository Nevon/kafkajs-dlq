const Consumer = require("./consumer");
const { KafkaJSDLQError } = require("./errors");

module.exports = class DLQ {
  constructor({ client }) {
    if (!client) {
      throw new KafkaJSDLQError('"client" must be an instance of KafkaJS');
    }

    this.client = client;
  }

  consumer({ consumer: kafkaJsConsumer, topics, eachMessage, eachBatch } = {}) {
    const consumer = new Consumer({
      consumer: kafkaJsConsumer,
      client: this.client,
      topics,
      eachMessage,
      eachBatch
    });

    return consumer.handlers();
  }
};
