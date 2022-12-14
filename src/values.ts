/// <reference path="./code.ts"/>

interface Value {
  greaterEquals(other: Value): boolean;
  greaterThan(other: Value): boolean;
  add(other: Value): Value
  subtract(other: Value): Value
  dividedBy(other: Value): Value
  numberValue(): number
  funcValue(): FuncDef
}

class FuncValue implements Value {
  value: FuncDef;

  constructor(value: FuncDef) {
    this.value = value;
  }

  greaterEquals(other: Value): boolean {
    throw new Error("Operation not permitted")
  }

  greaterThan(other: Value): boolean {
    throw new Error("Operation not permitted")
  }

  add(other: Value): Value {
    throw new Error("Operation not permitted")
  }

  subtract(other: Value): Value {
    throw new Error("Operation not permitted")
  }

  dividedBy(other: Value): Value {
    throw new Error("Operation not permitted")
  }

  numberValue(): number {
    throw new Error("Operation not permitted")
  }

  funcValue(): FuncDef {
    return this.value
  }

}

class NumberValue implements Value {
  value: number;

  constructor(value: number) {
    this.value = value;
  }
  
  greaterEquals(other: Value): boolean {
    if (other instanceof NumberValue) {
      return this.value >= other.value;
    } else {
      throw new Error("Operation not permitted")
    }
  }

  greaterThan(other: Value): boolean {
    if (other instanceof NumberValue) {
      return this.value > other.value;
    } else {
      throw new Error("Operation not permitted")
    }
  }

  add(other: Value): Value {
    if (other instanceof NumberValue) {
      return new NumberValue(this.value + other.value);
    } else {
      throw new Error("Operation not permitted")
    }
  }

  subtract(other: Value): Value {
    if (other instanceof NumberValue) {
      return new NumberValue(this.value - other.value);
    } else {
      throw new Error("Operation not permitted")
    }
  }

  dividedBy(other: Value): Value {
    if (other instanceof NumberValue) {
      return new NumberValue(this.value / other.value);
    } else {
      throw new Error("Operation not permitted")
    }
  }

  numberValue(): number {
    return this.value;
  }

  funcValue(): FuncDef {
    throw new Error("Operation not permitted")
  }
}