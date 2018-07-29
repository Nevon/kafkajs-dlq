# KafkaJS Dead Letter Queue

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
const Dlq = require('kafkajs-dlq')

const kafka = new Kafka({ ... })
const consumer = kafka.consumer({ ... })
const producer = kafka.producer()

const topic = 'example-topic'

const { eachMessage } = Dlq.consumer({
  topics: {
    [topic]: 'example-dead-letter-queue'
  },
  producer,
  eachMessage: async ({ topic, partition, message }) => {
    // If eachMessage rejects, the message will be
    // produced on the dead-letter queue
    throw new Error('Failed to process message')
  }
})

const run = async () => {
  await consumer.connect()
  await consumer.subscribe({ topic })
  await consumer.run({ eachMessage })
}

run()
```