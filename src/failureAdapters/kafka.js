const { FailureAdapter } = require("./adapter");

module.exports = class KafkaFailureAdapter extends FailureAdapter {
  constructor({ client, topic }) {
    super();

    this.client = client;
    this.producer = client.producer();
    this.topic = topic;
  }

  async setup() {
    await this.producer.connect();
  }

  async teardown() {
    await this.producer.disconnect();
  }

  async onFailure({ message }) {
    await this.producer.send({
      topic: this.topic,
      messages: [message]
    });
  }
};
