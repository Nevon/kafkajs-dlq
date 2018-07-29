const { Kafka, logLevel } = require("kafkajs");
const Dlq = require("kafkajs-dlq");

const {
  secureRandom,
  createTopic,
  brokers,
  waitForMessages
} = require("../testHelpers");

describe("[Integration] Consumer", () => {
  let client, sourceConsumer, dlqConsumer, sourceTopic, dlqTopic, producer;

  beforeEach(async () => {
    client = new Kafka({
      clientId: `test-client-${secureRandom()}`,
      brokers: brokers(),
      logLevel: logLevel.INFO
    });
    sourceConsumer = client.consumer({
      groupId: `consumer-group-id-${secureRandom()}`
    });
    dlqConsumer = client.consumer({
      groupId: `dlq-consumer-group-id-${secureRandom()}`
    });
    producer = client.producer();

    sourceTopic = `test-topic-${secureRandom()}`;
    dlqTopic = `test-topic-dlq-${secureRandom()}`;
    await Promise.all(
      [sourceTopic, dlqTopic].map(topic => createTopic({ topic }))
    );
  });

  it("produces messages to the dead-letter queue on processing failure", async () => {
    await sourceConsumer.subscribe({ topic: sourceTopic, fromBeginning: true });
    await dlqConsumer.subscribe({ topic: dlqTopic, fromBeginning: true });

    let sourceMessagesConsumed = [];
    const { eachMessage } = Dlq.consumer({
      topics: { [sourceTopic]: dlqTopic },
      consumer: sourceConsumer,
      producer,
      eachMessage: async event => {
        sourceMessagesConsumed.push(event);

        if (sourceMessagesConsumed.length % 2 === 0) {
          throw new Error("Failed to process message");
        }
      }
    });

    const messagesConsumed = [];
    dlqConsumer.run({
      eachMessage: async event => messagesConsumed.push(event)
    });

    sourceConsumer.run({ eachMessage });

    const messages = [
      { key: `key-${secureRandom()}`, value: `key-${secureRandom()}` },
      { key: `key-${secureRandom()}`, value: `key-${secureRandom()}` },
      { key: `key-${secureRandom()}`, value: `key-${secureRandom()}` },
      { key: `key-${secureRandom()}`, value: `key-${secureRandom()}` }
    ];
    await producer.send({
      topic: sourceTopic,
      messages
    });

    await waitForMessages(messagesConsumed, { number: 2 });

    const toComparable = event => ({
      key: event.message.key,
      value: event.message.value
    });
    expect(messagesConsumed.map(toComparable)).toEqual(
      sourceMessagesConsumed.filter((_, i) => i % 2 !== 0).map(toComparable)
    );
  });

  // @TODO: Seeking doesn't seem to work
  it.skip("seeks to the current offset if it fails to produce to the dead letter queue", async () => {
    await sourceConsumer.subscribe({ topic: sourceTopic, fromBeginning: true });
    await dlqConsumer.subscribe({ topic: dlqTopic, fromBeginning: true });

    let firstProduceCall = true;
    let sourceMessagesConsumed = [];
    const { eachMessage } = Dlq.consumer({
      topics: { [sourceTopic]: dlqTopic },
      consumer: sourceConsumer,
      producer: {
        send: async (...args) => {
          if (firstProduceCall) {
            firstProduceCall = false;
            throw new Error("Failed to produce");
          }

          await producer.send(...args);
        }
      },
      eachMessage: async event => {
        sourceMessagesConsumed.push(event);

        if (sourceMessagesConsumed.length < 3) {
          throw new Error("Failed to process message");
        }
      }
    });

    const messagesConsumed = [];
    dlqConsumer.run({
      eachMessage: async event => messagesConsumed.push(event)
    });

    sourceConsumer.run({ eachMessage });

    const messages = [
      { key: `key-${secureRandom()}`, value: `key-${secureRandom()}` },
      { key: `key-${secureRandom()}`, value: `key-${secureRandom()}` },
      { key: `key-${secureRandom()}`, value: `key-${secureRandom()}` },
      { key: `key-${secureRandom()}`, value: `key-${secureRandom()}` }
    ];
    await producer.send({
      topic: sourceTopic,
      messages
    });

    await waitForMessages(messagesConsumed, { number: 4 });
  });
});
