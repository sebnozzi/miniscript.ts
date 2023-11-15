
class RuntimeError extends Error {
  constructor(message: string) {
    super(`Runtime Error: ${message}`);
  }
}