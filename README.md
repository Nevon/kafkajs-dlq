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
const { DLQ, failureAdapters } = require('kafkajs-dlq')

const client = new Kafka({ ... })
const dlq = new DLQ({ client })

const topic = 'example-topic'

const { eachMessage } = dlq.consumer({
  topics: {
    [topic]: {
      failureAdapter: failureAdapters.kafka({ topic: `${topic}.dead-letter-queue` })
    }
  },
  eachMessage: async ({ topic, partition, message }) => {
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
```