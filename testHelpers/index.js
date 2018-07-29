const ip = require("ip");
const crypto = require("crypto");
const { Kafka } = require("kafkajs");
const waitFor = require("./waitFor");

const getHost = () => process.env.HOST_IP || ip.address();
const secureRandom = (length = 10) =>
  crypto.randomBytes(length).toString("hex");
const brokers = (host = getHost()) => [`${host}:9092`];

const testWaitFor = async (fn, opts = {}) =>
  waitFor(fn, { ...opts, ignoreTimeout: true });

const retryProtocol = (errorType, fn) =>
  waitFor(
    async () => {
      try {
        return await fn();
      } catch (e) {
        if (e.type !== errorType) {
          throw e;
        }
        return false;
      }
    },
    { ignoreTimeout: true }
  );

const waitForMessages = (buffer, { number = 1, delay = 50 } = {}) =>
  waitFor(() => (buffer.length >= number ? buffer : false), {
    delay,
    ignoreTimeout: true
  });

const createTopic = async ({ topic, partitions = 1 }) => {
  const kafka = new Kafka({
    clientId: "testHelpers",
    brokers: [`${getHost()}:9092`]
  });
  const admin = kafka.admin();

  try {
    await admin.connect();
    await admin.createTopics({
      waitForLeaders: true,
      topics: [{ topic, numPartitions: partitions }]
    });
  } finally {
    admin && (await admin.disconnect());
  }
};

module.exports = {
  secureRandom,
  brokers,
  retryProtocol,
  createTopic,
  waitFor: testWaitFor,
  waitForMessages
};
