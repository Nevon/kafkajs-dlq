const { Kafka, logLevel } = require("kafkajs");
const { DLQ, failureAdapters } = require("../");

const {
  secureRandom,
  createTopic,
  brokers,
  waitForMessages
} = require("../testHelpers");

const toComparable = event => ({
  key: event.message.key,
  value: event.message.value
});

describe("[Integration] Consumer", () => {
  let client, sourceConsumer, dlqConsumer, sourceTopic, dlqTopic, producer;

  beforeEach(async () => {
    client = new Kafka({
      clientId: `test-client-${secureRandom()}`,
      brokers: brokers(),
      logLevel: logLevel.NOTHING,
      retry: {
        initialRetryTime: 100,
        retries: 2
      }
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

    await sourceConsumer.connect();
    await dlqConsumer.connect();
    await producer.connect();
  });

  afterEach(async () => {
    await sourceConsumer.disconnect();
    await dlqConsumer.disconnect();
    await producer.disconnect();
  });

  it("produces messages to the dead-letter queue on processing failure", async () => {
    await sourceConsumer.subscribe({ topic: sourceTopic, fromBeginning: true });
    await dlqConsumer.subscribe({ topic: dlqTopic, fromBeginning: true });

    const sendToKafka = new failureAdapters.Kafka({
      topic: dlqTopic,
      client
    });

    const dlq = new DLQ({ client });

    let sourceMessagesConsumed = [];
    const { eachMessage } = dlq.consumer({
      consumer: sourceConsumer,
      topics: {
        [sourceTopic]: {
          failureAdapter: sendToKafka
        }
      },
      client,
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

    expect(messagesConsumed.map(toComparable)).toEqual(
      sourceMessagesConsumed.filter((_, i) => i % 2 !== 0).map(toComparable)
    );
  });
});
