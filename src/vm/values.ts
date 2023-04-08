/// <reference path="./code.ts"/>

function greaterEquals(a: any, b: any): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return a >= b
  } else {
    throw new Error("Invalid operation");
  }
}

function greaterThan(a: any, b: any): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return a > b
  } else {
    throw new Error("Invalid operation");
  }
}

function lessEquals(a: any, b: any): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return a <= b
  } else {
    throw new Error("Invalid operation");
  }
}

function lessThan(a: any, b: any): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return a < b
  } else {
    throw new Error("Invalid operation");
  }
}

function add(a: any, b: any): any {
  if (typeof a === "number" && typeof b === "number") {
    return a + b
  } else if (typeof a === "string" || typeof b === "string") {
    return toString(a) + toString(b);
  } else {
    throw new Error("Invalid operation");
  }
}

function subtract(a: any, b: any): number {
  if (typeof a === "number" && typeof b === "number") {
    return a - b
  } else {
    throw new Error("Invalid operation");
  }
}

function divide(a: any, b: any): number {
  if (typeof a === "number" && typeof b === "number") {
    return a / b
  } else {
    throw new Error("Invalid operation");
  }
}

function multiply(a: any, b: any): number {
  if (typeof a === "number" && typeof b === "number") {
    return a * b
  } else {
    throw new Error("Invalid operation");
  }
}

function power(a: any, b: any): number {
  if (typeof a === "number" && typeof b === "number") {
    return Math.pow(a, b);
  } else {
    throw new Error("Invalid operation");
  }
}

function logic_and(a: any, b: any): number {
  a = toBooleanNr(a);
  b = toBooleanNr(b);
  if (typeof a === "number" && typeof b === "number") {
    return absClamp01(a * b);
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error("Invalid operation");
  }
}

function logic_or(a: any, b: any): number {
  a = toBooleanNr(a);
  b = toBooleanNr(b);
  if (typeof a === "number" && typeof b === "number") {
    return absClamp01(a + b - a * b);
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error("Invalid operation");
  }
}

function absClamp01(value: number): number {
  if (value < 0) value = -value;
  if (value > 1) return 1;
  return value;
}

function toBooleanNr(value: any): number {
  if (value === null) {
    return 0;
  } else if (typeof value == "number" ) {
    return value;
  } else {
    throw new Error("Type not supported: " + value);
  }
}

function toString(a: any): string {
  if (typeof a === "number") {
    return "" + a;
  } else if (typeof a === "string" ) {
    return a;
  } else {
    throw new Error("Don't know how to make a string out of: " + a);
  }
}
