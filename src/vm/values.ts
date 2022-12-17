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

function add(a: any, b: any): number {
  if (typeof a === "number" && typeof b === "number") {
    return a + b
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
