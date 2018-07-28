module.exports = ({
  eachMessage,
  topics,
  producer,
  consumer,
  logger
}) => async (...args) => {
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
        "Failed to send message to dead-letter queue. Seeking to current offset",
        {
          error: e.message || e,
          deadLetterQueue: deadLetterTopic,
          topic,
          offset: message.offset
        }
      );

      consumer.seek({
        topic,
        partition,
        offset: message.offset
      });
    }
  }
};
