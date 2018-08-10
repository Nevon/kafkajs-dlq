const { KafkaJSDLQAbortBatch } = require("../errors");
const { KafkaFailureAdapter } = require("../failureAdapters");

module.exports = ({ eachMessage, failureAdapter, logger }) => {
  return async (...args) => {
    try {
      logger.info("Calling eachmessage", {
        ...args
      });
      return await eachMessage(...args);
    } catch (e) {
      const { message, topic, partition } = args[0];

      logger.warn("Failed to process message", {
        error: e.message || e,
        stack: e.stack
      });

      try {
        await failureAdapter.onFailure({ topic, partition, message });
      } catch (e) {
        logger.error(
          "Failed to send message via failure adapter. Restarting from last resolved offset.",
          {
            error: e.message || e,
            topic,
            partition,
            offset: message.offset,
            failureAdapter: failureAdapter.name
          }
        );

        throw new KafkaJSDLQAbortBatch(e);
      }
    }
  };
};
