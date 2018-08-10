const Consumer = require("./consumer");
const { KafkaJSDLQError } = require("./errors");

module.exports = class DLQ {
  constructor({ client }) {
    if (!client) {
      throw new KafkaJSDLQError('"client" must be an instance of KafkaJS');
    }

    this.client = client;
  }

  consumer({ topics, eachMessage, eachBatch } = {}) {
    const consumer = new Consumer({
      client: this.client,
      topics,
      eachMessage,
      eachBatch
    });

    return consumer.handlers();
  }
};
