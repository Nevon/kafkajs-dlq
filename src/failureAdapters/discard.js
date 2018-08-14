const { FailureAdapter } = require("./adapter");

module.exports = class DiscardOnFailureAdapter extends FailureAdapter {
  constructor({ logger, topic }) {
    super();
    this.logger = logger;
    this.topic = topic;
  }

  async onFailure({ message }) {
    this.logger.error("Failed to process message", {
      topic: this.topic,
      partition: message.partition,
      offset: message.offset
    });
  }
};
