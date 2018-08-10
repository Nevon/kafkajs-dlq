# KafkaJS Dead Letter Queue

[![Build Status](https://travis-ci.com/Nevon/kafkajs-dlq.svg?branch=master)](https://travis-ci.com/Nevon/kafkajs-dlq)
[![npm version](https://badge.fury.io/js/kafkajs-dlq.svg)](https://badge.fury.io/js/kafkajs-dlq)

[KafkaJS](https://github.com/tulios/kafkajs) plugin to handle message
processing failures by forwarding problematic messages to a dead-letter
queue.

> Dead Letter Queues are message queues that can be produced to when
> a message on another queue cannot be processed successfully. Dead-letter
> queues are useful for debugging your application or messaging system
> because they let you isolate problematic messages to determine why
> their processing doesn't succeed.

**WIP: This project is not ready for use as of yet**

## Usage

```javascript
const { Kafka } = require('kafkajs')
const DLQ = require('kafkajs-dlq')

const client = new Kafka({ ... })
const dlq = new DLQ({ client })

const topic = 'example-topic'

const { eachMessage, disconnect } = dlq.consumer({
  topics: {
    [topic]: {
      delayedExecution: [
        { topic: `${topic}.5m`, delay: 5 * 60 * 1000 },
        { topic: `${topic}.20m`, delay: 20 * 60 * 1000 }
      ],
      onFailure: dlq.kafkaFailureAdapter({ topic: `${topic}.dead-letter-queue` })
    }
  },
  eachMessage: async ({ topic, partition, message }) => {
    // If eachMessage rejects, the message will be
    // produced to the first delayed execution topic
    // and re-consumed after the delay.
    //
    // Once it has failed to be processed in each of
    // the delayed execution topics, it gets passed
    // to the failure adapter. In this case, it will
    // be published to the indicated topic.
    throw new Error('Failed to process message')
  }
})

const consumer = client.consumer({ ... })

const run = async () => {
  await consumer.connect()
  await consumer.subscribe({ topic })
  await consumer.run({ eachMessage })
}

run()

// Remember to call "disconnect" whenever you disconnect
// your Kafka client
await disconnect()
```