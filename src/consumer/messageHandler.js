const { KafkaJSDLQAbortBatch } = require("../errors");

module.exports = ({ eachMessage, topics, producer, logger }) => async (
  ...args
) => {
  try {
    return await eachMessage(...args);
  } catch (e) {
    const { message, topic, partition } = args[0];
    const deadLetterTopic = topics[topic];

    if (!deadLetterTopic) {
      throw e;
    }

    try {
      await producer.send({
        topic: deadLetterTopic,
        messages: [message]
      });
    } catch (e) {
      logger.error(
        "Failed to send message to dead-letter queue. Restarting from last resolved offset.",
        {
          error: e.message || e,
          deadLetterQueue: deadLetterTopic,
          topic,
          partition,
          offset: message.offset
        }
      );

      throw new KafkaJSDLQAbortBatch(e);
    }
  }
};
