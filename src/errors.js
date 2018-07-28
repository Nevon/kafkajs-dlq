class KafkaJSDLQError extends Error {
  constructor(e) {
    super(e);
    Error.captureStackTrace(this, this.constructor);
    this.message = e.message || e;
    this.name = this.constructor.name;
  }
}

class KafkaJSDLQNotImplemented extends KafkaJSDLQError {}

module.exports = {
  KafkaJSDLQError,
  KafkaJSDLQNotImplemented
};
