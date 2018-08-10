const Adapter = require("./adapter");

describe("Failure Adapter", () => {
  it("should throw when instantiated", () => {
    expect(() => new Adapter()).toThrowError(
      "Can not construct abstract class FailureAdapter."
    );
  });

  it('should throw if child class does not implement "onFailure"', () => {
    class Foo extends Adapter {}

    expect(() => new Foo()).toThrowError(
      "Abstract method onFailure not implemented by Foo."
    );
  });
});
