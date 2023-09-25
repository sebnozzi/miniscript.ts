class FuncDefArg {

  readonly name: string;
  readonly defaultValue: any | undefined;

  constructor(name: string, defaultValue: any | undefined) {
    this.name = name;
    this.defaultValue = defaultValue;
  }

}

class FuncDef {

  readonly arguments: FuncDefArg[];

  readonly argNames: string[];
  readonly reversedArgNames: string[];
  readonly defaultValues: any[];
  // Takes into account arguments with default values (which can be omitted).
  readonly requiredArgCount: number;

  private readonly code: Code | Function;

  // The "default values" array has to have the same length s "arg-names".
  // Pass "undefined" as the value if it has NO default value.
  constructor(args: FuncDefArg[], code: Code | Function) {
    this.arguments = args;

    this.argNames = args.map((a) => a.name);
    this.reversedArgNames = this.argNames.slice().reverse();
    this.defaultValues = args.map((a) => a.defaultValue);
    // Count arguments without default values
    this.requiredArgCount = this.defaultValues.filter((v) => v === undefined).length;
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
