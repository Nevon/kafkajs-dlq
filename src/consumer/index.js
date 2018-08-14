const createEachMessageHandler = require("./messageHandler");
const { KafkaJSDLQError, KafkaJSDLQNotImplemented } = require("../errors");
const { FailureAdapter, _initialized } = require("../failureAdapters/adapter");
const DQLProducer = require("./producer");

const NAMESPACE = "KafkaJSDLQ";

const createLogger = client => {
  const rootLogger =
    (typeof client.logger === "function" && client.logger()) || client.logger;

  return rootLogger.namespace(NAMESPACE);
};

const _validate = Symbol();
const _subscribe = Symbol();

module.exports = class Consumer {
  constructor(args = {}) {
    Consumer[_validate](args);

    const {
      consumer,
      client,
      topics,
      eachMessage,
      producerOptions,
      producerSendOptions
    } = args;

    this.client = client;
    this.consumer = consumer;
    this.topics = topics;
    this.eachMessage = eachMessage;
    this.logger = createLogger(client);
    this.producer = new DQLProducer(
      this.client.producer(producerOptions),
      producerSendOptions
    );
  }

  handlers() {
    const eachMessage = createEachMessageHandler({
      producer: this.producer,
      eachMessage: this.eachMessage,
      topics: this.topics,
      logger: this.logger
    });

    this[_subscribe]();

    return {
      eachMessage,
      eachBatch: () => {
        throw new KafkaJSDLQNotImplemented('"eachBatch" is not implemented');
      }
    };
  }

  static [_validate]({ consumer, topics, eachMessage, eachBatch }) {
    if (!eachMessage && !eachBatch) {
      throw new KafkaJSDLQError(
        'Either "eachMessage" or "eachBatch" needs to be a function'
      );
    }

    if (!topics) {
      throw new KafkaJSDLQError(
        '"topics" needs to be a failure configuration for a source topic'
      );
    }

    if (!consumer) {
      throw new KafkaJSDLQError(
        '"consumer" needs to be an instance of KafkaJs#consumer'
      );
    }

    for (let topic of Object.keys(topics)) {
      const { failureAdapter } = topics[topic] || {};

      if (!failureAdapter || !(failureAdapter instanceof FailureAdapter)) {
        throw new KafkaJSDLQError(
          `"failureAdapter" for topic configuration "${topic}" needs to be an instance of an implementation of ${
            FailureAdapter.name
          }`
        );
      }
    }
  }

  [_subscribe]() {
    const topicAdapters = Object.keys(this.topics).map(topic => ({
      topic,
      adapter: this.topics[topic].failureAdapter
    }));

    this.consumer.on(this.consumer.events.CONNECT, async () => {
      await this.producer.connect();
      const adapterSetupPromises = topicAdapters.map(({ topic, adapter }) => {
        this.logger.debug(`Invoking setup of failure adapter`, {
          adapter: adapter.name,
          topic
        });

        const promise = adapter.setup();
        adapter[_initialized] = true;

        return promise;
      });

      return Promise.all(adapterSetupPromises);
    });

    this.consumer.on(this.consumer.events.DISCONNECT, async () => {
      const adapterTeardownPromises = topicAdapters.map(
        ({ topic, adapter }) => {
          this.logger.debug(`Invoking teardown of failure adapter`, {
            adapter: adapter.name,
            topic
          });

          const promise = adapter.teardown();
          adapter[_initialized] = false;
          return promise;
        }
      );

      return Promise.all(adapterTeardownPromises);
    });
  }
};
