
class FuncDef {
  readonly argNames: string[];
  readonly reversedArgNames: string[];
  readonly defaultValues: any[];
  // Takes into account arguments with default values (which can be omitted).
  readonly requiredArgCount: number;
  private readonly code: Code | Function;

  constructor(argNames: string[], defaultValues: any[], code: Code | Function) {
    this.argNames = argNames;
    this.reversedArgNames = argNames.slice().reverse();
    this.defaultValues = defaultValues;
    // Count arguments without default values
    this.requiredArgCount = defaultValues.filter((v) => v === undefined).length;
    this.code = code;
  }

  getLastNDefaultValues(amount: number): any[] {
    return this.defaultValues.slice(-amount);
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
