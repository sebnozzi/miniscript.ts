/// <reference path="./values.ts"/>

class Context {

  locals: {[id: string]: any};
  parent: Context | null;
  forLoops: {[id: number]: ForLoop};

  constructor(parent: Context | null = null) {
    this.locals = {};
    this.parent = parent;
    this.forLoops = {};
  }

  setLocal(identifier: string, value: any) {
    this.locals[identifier] = value;
  }

  get(identifier: string): any {
    let localValue = this.locals[identifier];
    if (localValue !== undefined) {
      return localValue;
    } else if (this.parent) {
      return this.parent.get(identifier);
    } else {
      throw new Error("Could not resolve: " + identifier);
    }
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