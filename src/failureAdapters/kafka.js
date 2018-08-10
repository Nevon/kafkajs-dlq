const FailureAdapter = require("./adapter");

module.exports = class KafkaFailureAdapter extends FailureAdapter {
  constructor({ client, topic }) {
    super();

    this.client = client;
    this.producer = client.producer();
    this.topic = topic;
  }

  async onFailure({ message }) {
    // @TODO: Remove once KafkaJS exposes connect/disconnect events
    await this.producer.connect();

    await this.producer.send({
      topic: this.topic,
      messages: [message]
    });

    // @TODO: Remove once KafkaJS exposes connect/disconnect events
    await this.producer.disconnect();
  }
};
