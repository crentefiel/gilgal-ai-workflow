export class ConfigurationError extends Error {
  readonly exitCode = 3;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ConfigurationError';
  }
}

export class InternalError extends Error {
  readonly exitCode = 4;

  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'InternalError';
  }
}

export class InterruptedError extends Error {
  readonly exitCode = 130;

  constructor() {
    super('Sentinel was interrupted; no successful report was recorded.');
    this.name = 'InterruptedError';
  }
}
