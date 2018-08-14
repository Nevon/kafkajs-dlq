const { Kafka: KafkaFailureAdapter } = require(".");
let logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn()
};

logger.namespace = () => logger;

let producer = {
  logger: () => logger,
  send: jest.fn(),
  connect: jest.fn(),
  disconnect: jest.fn()
};

const client = {
  producer: () => producer,
  logger: () => logger
};

const topic = "failure-topic";
const message = { key: "key", value: "value" };

describe("Kafka Failure Adapter", () => {
  it("connects the producer when initialized", async () => {
    const adapter = new KafkaFailureAdapter({ client, topic });

    await adapter.setup();

    expect(producer.connect).toHaveBeenCalled();
  });

  it("disconnects the producer on teardown", async () => {
    const adapter = new KafkaFailureAdapter({ client, topic });

    await adapter.teardown();

    expect(producer.disconnect).toHaveBeenCalled();
  });

  it("produces the message to the specified topic when invoked", async () => {
    producer.send.mockImplementation(() => Promise.resolve());
    const adapter = new KafkaFailureAdapter({ client, topic });

    await adapter.onFailure({ message });

    expect(producer.send).toHaveBeenCalledWith({ topic, messages: [message] });
  });

  it("throws an error when failing to produce to the topic", async () => {
    const error = new Error("Something went wrong");
    producer.send.mockImplementation(() => Promise.reject(error));

    const adapter = new KafkaFailureAdapter({ client, topic });

    await expect(adapter.onFailure({ message })).rejects.toThrowError(error);
  });
});
