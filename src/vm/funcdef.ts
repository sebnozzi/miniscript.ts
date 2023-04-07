
class FuncDef {
  // TODO: support default values (at some point)
  // (or maybe not, this should be handled at the compiler level)
  readonly params: string[];
  private readonly code: Code | Function;

  constructor(params: string[], code: Code | Function) {
    this.params = params;
    this.code = code;
  }

  isNative(): boolean {
    return this.code instanceof Function;
  }

  getCode(): Code {
    return this.code as Code;
  }

  getFunction(): Function {
    return this.code as Function;
  }
}
