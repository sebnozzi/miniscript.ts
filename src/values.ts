/// <reference path="./code.ts"/>

interface Value {
  greaterEquals(other: Value): boolean;
  add(other: Value): Value
  dividedBy(other: Value): Value
  numberValue(): number
  codeValue(): Code
}

class FuncValue implements Value {
  value: Code;

  constructor(value: Code) {
    this.value = value;
  }

  greaterEquals(other: Value): boolean {
    throw new Error("Operation not permitted")
  }

  add(other: Value): Value {
    throw new Error("Operation not permitted")
  }

  dividedBy(other: Value): Value {
    throw new Error("Operation not permitted")
  }

  numberValue(): number {
    throw new Error("Operation not permitted")
  }

  codeValue(): Code {
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

  add(other: Value): Value {
    if (other instanceof NumberValue) {
      return new NumberValue(this.value + other.value);
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

  codeValue(): Code {
    throw new Error("Operation not permitted")
  }
}