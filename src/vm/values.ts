/// <reference path="./code.ts"/>

type IndexedCollection = {
  length: number;
}

function equals(a: any, b: any): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return a == b
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error("Invalid operation");
  }
}

function greaterEquals(a: any, b: any): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return a >= b
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error("Invalid operation");
  }
}

function greaterThan(a: any, b: any): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return a > b
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error("Invalid operation");
  }
}

function lessEquals(a: any, b: any): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return a <= b
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error("Invalid operation");
  }
}

function lessThan(a: any, b: any): boolean {
  if (typeof a === "number" && typeof b === "number") {
    return a < b
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error("Invalid operation");
  }
}

function add(a: any, b: any): any {
  if (typeof a === "number" && typeof b === "number") {
    return a + b
  } else if (typeof a === "string" || typeof b === "string") {
    return toString(a) + toString(b);
  } else if (a instanceof Array) {
    if (b instanceof Array) {
      return a.concat(b);
    } else {
      throw new Error(`Got ${b} instead of another List`);
    }
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error("Invalid operation");
  }
}

function subtract(a: any, b: any): number {
  if (typeof a === "number" && typeof b === "number") {
    return a - b
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error("Invalid operation");
  }
}

function divide(a: any, b: any): number {
  if (typeof a === "number" && typeof b === "number") {
    return a / b
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error("Invalid operation");
  }
}

function multiply(a: any, b: any): any {
  if (typeof a === "number" && typeof b === "number") {
    return a * b;
  } else if (a instanceof Array) {
    if (typeof b === "number") {
      let result = new Array();
      if (b > 0) {
        // Add whole repetitions
        const repetitionCount = Math.floor(b);
        for (let i = 0; i < repetitionCount; i++) {
          result = result.concat(a);
        }
        // Take the part after "comma" with (%1) (e.g. 7.25 -> 0.25)
        // and use it to know how many more elements of the collection
        // to take. For this, multiply by the total length and take first
        // N elements.
        const additionalElementsSliceEnd = Math.floor((b % 1) * a.length);
        const additionalElements = a.slice(0, additionalElementsSliceEnd);
        result = result.concat(additionalElements);
      }
      return result;
    } else {
      throw new Error(`Number required for list replication. Got ${b} instead.`);
    }
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error("Invalid operation");
  }
}

function power(a: any, b: any): number {
  if (typeof a === "number" && typeof b === "number") {
    return Math.pow(a, b);
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error("Invalid operation");
  }
}

function modulus(a: any, b: any): number {
  if (typeof a === "number" && typeof b === "number") {
    return a % b;
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
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

function computeEffectiveIndex(accessTarget: IndexedCollection, index: number): number {
  // Compute effective index
  const effectiveIndex = (index < 0) ? index + accessTarget.length : index;
  // Check bounds
  if (effectiveIndex < 0 || effectiveIndex >= accessTarget.length) {
    throw new Error(`Index Error (index ${index} out of range)`);
  }
  return effectiveIndex;
}

function toBooleanNr(value: any): number {
  if (value === null) {
    return 0;
  } else if (typeof value == "number" ) {
    return value;
  } else if (value instanceof Array) {
    return value.length;
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
