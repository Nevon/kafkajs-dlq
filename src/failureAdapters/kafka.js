const FailureAdapter = require("./adapter");

module.exports = class KafkaFailureAdapter extends FailureAdapter {
  constructor({ client, topic }) {
    super();

    this.client = client;
    this.producer = client.producer();
    this.topic = topic;
  }

  async onFailure({ message }) {
    this.producer.logger().info("Received message in failure handler", {
      message,
      topic: this.topic
    });
    await this.producer.send({
      topic: this.topic,
      messages: [message]
    });
  }
};
