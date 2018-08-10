const { KafkaJSDLQAbortBatch } = require("../errors");
const { KafkaFailureAdapter } = require("../failureAdapters");

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
