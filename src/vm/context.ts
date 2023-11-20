/// <reference path="./values.ts"/>

class Context {

  private readonly locals: HashMap;
  private readonly parent: Context | null;
  private readonly forLoops: {[id: number]: ForLoop};
  private readonly globalContext: Context;
  private readonly vm: Processor;

  constructor(vm: Processor, parent: Context | null = null) {
    this.locals = new HashMap();
    this.parent = parent;
    this.forLoops = {};
    this.vm = vm;
    this.globalContext = vm.globalContext;
  }

  setLocal(identifier: string, value: any) {
    if (identifier === "globals") {
      throw new RuntimeError(`can't assign to globals [line ${this.vm.getCurrentSrcLineNr()}]`);
    } else if (identifier === "locals") {
      throw new RuntimeError(`can't assign to locals [line ${this.vm.getCurrentSrcLineNr()}]`);
    }
    this.locals.set(identifier, value);
  }

  getOpt(identifier: string): any | undefined {
    if (identifier === "globals") {
      return this.globalContext.locals;
    } else if (identifier === "locals") {
      return this.locals;
    } else {
      if (this.locals.has(identifier)) {
        const localValue = this.locals.get(identifier);
        return localValue;
      } else if (this.parent) {
        return this.parent.getOpt(identifier);
      } else {
        return undefined;
      }
    }
  }

  // Normally the parent context inside a function.
  // At the global scope outer == globals.
  getOuterScopeLocals(vm: Processor): HashMap {
    let outerContext;
    if (this.parent) {
      outerContext = this.parent;
    } else {
      outerContext = vm.globalContext;
    }
    return outerContext.locals;
  }

  registerForLoop(forLoopNr: number, forLoop: ForLoop) {
    this.forLoops[forLoopNr] = forLoop;
  }
  getForLoop(forLoopNr: number): ForLoop {
    return this.forLoops[forLoopNr];
  }
  deleteForLoop(forLoopNr: number) {
    delete this.forLoops[forLoopNr];
  }

}
