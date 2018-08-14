const { KafkaJSDLQAbortBatch } = require("../errors");

module.exports = class DLQProducer {
  constructor(producer, sendOptions) {
    this.producer = producer;
    this.sendOptions = sendOptions;
  }

  async connect() {
    return this.producer.connect();
  }

  async disconnect() {
    return this.producer.disconnect();
  }

  async send(args) {
    try {
      await this.producer.connect();
      return this.producer.send({ ...this.sendOptions, ...args });
    } catch (e) {
      throw new KafkaJSDLQAbortBatch(e);
    }
  }
};
