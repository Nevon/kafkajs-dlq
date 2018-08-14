const { KafkaJSDLQAbortBatch } = require("../errors");
const { _initialized } = require("../failureAdapters/adapter");

const setupIfNeeded = async adapter => {
  if (!adapter[_initialized]) {
    await adapter.setup();

    adapter[_initialized] = true;
  }
};

module.exports = ({ eachMessage, topics, logger }) => {
  return async (...args) => {
    try {
      return await eachMessage(...args);
    } catch (e) {
      const { message, topic, partition } = args[0];
      const topicConfiguration = topics[topic];

      if (!topicConfiguration) {
        throw e;
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
