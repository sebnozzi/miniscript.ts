/// <reference path="./values.ts"/>

class Context {
  locals: {[id: string]: any};
  parent: Context | null;

  constructor(parent: Context | null = null) {
    this.locals = {};
    this.parent = parent;
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

}