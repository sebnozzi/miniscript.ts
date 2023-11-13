
class NotImplemented extends Error {
  constructor(message: string) {
    super(message);
  }
}

// Ideally these should not happen.
// Either a runtime-error should be thrown
// or the parser revised to catch errors
// earlier.
class CompileTimeError extends Error {
  constructor(message: string) {
    super(message);
  }
}