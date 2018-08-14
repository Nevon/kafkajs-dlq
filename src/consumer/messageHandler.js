const { KafkaJSDLQAbortBatch } = require("../errors");
const { _initialized } = require("../failureAdapters/adapter");

const setupIfNeeded = async adapter => {
  if (!adapter[_initialized]) {
    await adapter.setup();

    adapter[_initialized] = true;
  }
};

class DQLMessage {
  constructor(topics, { message, topic, partition }) {
    this.topics = topics;
    this.message = message;
    this.topic = topic;
    this.partition = partition;
    this.originTopic = this.message.headers["DLQ-Origin"] || this.topic;
    this.delayedConfigs = this.topics[this.originTopic];
  }

  forwardToConfig() {
    const { delayedExecution } = this.delayedConfigs;
    const currentConfigIndex = (delayedExecution || []).indexOf(
      delayedExecution.find(config => config.topic === this.topic)
    );

    const forwardToConfig = delayedExecution[currentConfigIndex + 1];
    if (forwardToConfig) {
      return forwardToConfig;
    }
  }

  toKafkaJS() {
    return {
      key: this.message.key,
      value: this.message.value,
      headers: {
        ...this.message.headers,
        "DLQ-Origin": this.originTopic,
        "DLQ-Published-At": new Date().toISOString()
      }
    };
  }
}

module.exports = ({ producer, eachMessage, topics, logger }) => {
  return async (...args) => {
    try {
      return await eachMessage(...args);
    } catch (e) {
      const message = new DQLMessage(topics, args[0]);
      const topicConfiguration = message.delayedConfigs;

      if (!topicConfiguration) {
        throw e;
      }

      const forwardToConfig = message.forwardToConfig();
      if (forwardToConfig) {
        return producer.send({
          topic: forwardToConfig.topic,
          messages: [message.toKafkaJS()]
        });
      }

      try {
        // Set up in case consumer was already connected
        // before DLQ consumer was initialized
        await setupIfNeeded(topicConfiguration.failureAdapter);

        await topicConfiguration.failureAdapter.onFailure({
          topic,
          partition,
          message
        });
      } catch (e) {
        logger.error(
          "Failed to send message via failure adapter. Restarting from last resolved offset.",
          {
            error: e.message || e,
            topic,
            partition,
            offset: message.offset,
            failureAdapter: topicConfiguration.failureAdapter.name
          }
        );

        throw new KafkaJSDLQAbortBatch(e);
      }
    }
  };
};
