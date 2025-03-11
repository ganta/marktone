export class CybozuDataInitializationTimeoutError extends Error {
  constructor(timeoutMilliseconds: number) {
    super(
      `Could not receive the Cybozu data within ${timeoutMilliseconds} milliseconds`,
    );
    this.name = "CybozuDataInitializationTimeoutError";
    Object.setPrototypeOf(this, CybozuDataInitializationTimeoutError.prototype);
  }
}

export class UninitializedCybozuDataError extends Error {
  constructor() {
    super("Cybozu data is not initialized yet");
    this.name = "UninitializedCybozuDataError";
    Object.setPrototypeOf(this, UninitializedCybozuDataError.prototype);
  }
}
