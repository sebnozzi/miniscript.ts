
class FuncDef {
  readonly argNames: string[];
  readonly reversedArgNames: string[];
  readonly defaultValues: {[argName: string]: any};
  // Takes into account arguments with default values (which can be omitted).
  readonly requiredArgCount: number;
  private readonly code: Code | Function;

  constructor(argNames: string[], defaultValues: {[argName: string]: any}, code: Code | Function) {
    this.argNames = argNames;
    this.reversedArgNames = argNames.slice().reverse();
    this.defaultValues = defaultValues;
    this.requiredArgCount = argNames.length - Object.keys(defaultValues).length;
    this.code = code;
  }

  getLastNDefaultValues(amount: number): any[] {
    const lastNArgNames = this.argNames.slice(-amount);
    const values = [];
    for (let argName of lastNArgNames) {
      const defaultValue = this.defaultValues[argName];
      values.push(defaultValue);
    }
    return values;
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
