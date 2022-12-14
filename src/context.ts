/// <reference path="./values.ts"/>

class Context {
  locals: {[id: string]: Value};
  parent: Context | null;

  constructor(parent: Context | null = null) {
    this.locals = {};
    this.parent = parent;
  }

  setLocal(identifier: string, value: Value) {
    this.locals[identifier] = value;
  }

  get(identifier: string): Value {
    let localValue: Value | undefined = this.locals[identifier];
    if (localValue) {
      return localValue;
    } else if (this.parent) {
      return this.parent.get(identifier);
    } else {
      throw new Error("Could not resolve: " + identifier);
    }
  }

}