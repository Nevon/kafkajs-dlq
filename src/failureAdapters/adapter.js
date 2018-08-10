/**
 * FailureAdapters are expected to implement the async
 * method "onFailure". In case the failure handling fails,
 * they are expected to throw an error.
 */
module.exports = class FailureAdapter {
  constructor() {
    if (this.constructor === FailureAdapter) {
      throw new TypeError(
        `Can not construct abstract class ${FailureAdapter.name}.`
      );
    }

    if (this.onFailure === FailureAdapter.prototype.onFailure) {
      throw new TypeError(
        `Abstract method ${this.onFailure.name} not implemented by ${
          this.constructor.name
        }.`
      );
    }
  }

  async onFailure({ topic, partition, message }) {
    throw new TypeError(
      `Calling abstract method ${this.onFailure.name} of ${
        FailureAdapter.name
      }.`
    );
  }
};
