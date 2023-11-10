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
  readonly effectiveDefaultValues: any[];

  private readonly code: Code | Function;

  // The "default values" array has to have the same length s "arg-names".
  // Pass "undefined" as the value if it has NO default value.
  constructor(args: FuncDefArg[], code: Code | Function) {
    this.arguments = args;

    this.argNames = args.map((a) => a.name);
    this.reversedArgNames = this.argNames.slice().reverse();
    this.effectiveDefaultValues = args.map((a) => a.defaultValue === undefined ? null : a.defaultValue);
    this.code = code;
  }

  getLastNEffectiveDefaultValues(amount: number): any[] {
    return this.effectiveDefaultValues.slice(-amount);
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

// A function definition which is bound to a context at runtime.
// As such it's ready to run and variables should be able to be 
// resolved even in parent contexts.
class BoundFunction {

  public readonly funcDef: FuncDef;
  public readonly context: Context;

  constructor(funcDef: FuncDef, context: Context) {
    this.funcDef = funcDef;
    this.context = context;
  }

}