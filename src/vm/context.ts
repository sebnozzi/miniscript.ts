import { MSMap } from "./msmap";
import { Processor } from "./processor";
import { RuntimeError } from "./runtime";

export class Context {

  private readonly locals: MSMap;
  private readonly parent: Context | null;
  private readonly vm: Processor;

  constructor(vm: Processor, parent: Context | null = null) {
    this.locals = new MSMap(vm);
    this.parent = parent;
    this.vm = vm;
  }

  setLocal(identifier: string, value: any) {
    if (identifier === "globals") {
      throw new RuntimeError(`Can't assign to globals`);
    } else if (identifier === "locals") {
      throw new RuntimeError(`Can't assign to locals`);
    }
    this.locals.set(identifier, value);
  }

  getOpt(identifier: string): any | undefined {
    if (this.locals.has(identifier)) {
      const localValue = this.locals.get(identifier);
      return localValue;
    } else if (identifier === "globals") {
      return this.vm.globalContext.locals;
    } else if (identifier === "locals") {
      return this.locals;
    } else if (identifier === "outer") {
      return this.getOuterLocals();
    } else if (this.parent) {
      return this.parent.getOpt(identifier);
    } else {
      return this.vm.resolveIntrinsic(identifier);
    }
  }

  // Normally the parent context inside a function.
  // At the global scope outer == globals.
  private getOuterLocals(): MSMap {
    let outerContext;
    if (this.parent) {
      outerContext = this.parent;
    } else {
      outerContext = this.vm.globalContext;
    }
    return outerContext.locals;
  }

}
