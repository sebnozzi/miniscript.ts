/// <reference path="./code.ts"/>

type IndexedCollection = {
  length: number;
}

type Concatenable = {
  concat(a: any): any;
}

function equals(a: any, b: any): number {
  // JavaScript does not compare Arrays the way we want
  // so we have to implement our own version.
  if (a instanceof Array && b instanceof Array) {
    if (a.length !== b.length) {
      return 0;
    } else {
      for (let i = 0; i < a.length; i++) {
        if (a[i] !== b[i]) {
          return 0;
        }
      }
      return 1;
    }
  } else {
    return a === b ? 1 : 0;
  }
}

function greaterEquals(a: any, b: any): number | null {
  if (typeof a === "number" && typeof b === "number") {
    return a >= b ? 1 : 0;
  } else if (typeof a === "string" && typeof b === "string") {
    return a >= b ? 1 : 0;
  } else {
    return null;
  }
}

function greaterThan(a: any, b: any): number | null {
  if (typeof a === "number" && typeof b === "number") {
    return a > b ? 1 : 0;
  } else if (typeof a === "string" && typeof b === "string") {
    return a > b ? 1 : 0;
  } else {
    return null;
  }
}

function lessEquals(a: any, b: any): number | null {
  if (typeof a === "number" && typeof b === "number") {
    return a <= b ? 1 : 0;
  } else if (typeof a === "string" && typeof b === "string") {
    return a <= b ? 1 : 0;
  } else {
    return null;
  }
}

function lessThan(a: any, b: any): number | null {
  if (typeof a === "number" && typeof b === "number") {
    return a < b ? 1 : 0;
  } else if (typeof a === "string" && typeof b === "string") {
    return a < b ? 1 : 0;
  } else {
    return null;
  }
}

function chainedComparison(values: any[], operators: string[]): number {
  const pairCount = operators.length;
  // Evaluate in pairs
  for (let i = 0; i < pairCount; i++) {
    const operator = operators[i];
    const left = values[i];
    const right = values[i+1];
    let result: number | null;
    if (operator === ">") {
      result = greaterThan(left, right);
    } else if (operator === ">=") {
      result = greaterEquals(left, right);
    } else if (operator === "<") {
      result = lessThan(left, right);
    } else if (operator === "<=") {
      result = lessEquals(left, right);
    } else {
      throw new Error("Invalid operator");
    }
    if (!result) {
      return 0;
    }
  }
  return 1;
}

function add(a: any, b: any): any {
  if (typeof a === "number" && typeof b === "number") {
    // Perform arithmetic addition
    return a + b
  } else if (typeof a === "string" || typeof b === "string") {
    // Convert both values to String and concatenate
    return toString(a) + toString(b);
  } else if (a instanceof Array) {
    if (b instanceof Array) {
      return a.concat(b);
    } else {
      throw new Error(`Got ${b} instead of another List`);
    }
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error(`Cannot add ${formatValue(a,true)} + ${formatValue(b,true)}`);
  }
}

function subtract(a: any, b: any): any {
  if (typeof a === "number" && typeof b === "number") {
    return a - b;
  } else if (typeof a === "string" && typeof b === "string") {
    const suffixIdx = a.lastIndexOf(b);
    // Force match at the end
    const matchIdx = a.length - b.length;
    if (suffixIdx >= 0 && suffixIdx == matchIdx) {
      return a.substring(0, suffixIdx); 
    } else {
      return a;
    }
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error(`Cannot subtract ${formatValue(a,true)} - ${formatValue(b,true)}`);
  }
}

function divide(a: any, b: any): number {
  if (typeof a === "number" && typeof b === "number") {
    return a / b
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error(`Cannot divide ${formatValue(a,true)} / ${formatValue(b,true)}`);
  }
}

function multiply(a: any, b: any): any {
  if (typeof a === "number" && typeof b === "number") {
    return a * b;
  } else if (a instanceof Array || typeof a === "string") {
    if (typeof b === "number") {
      let result: Concatenable = (typeof a === "string") ? "" : new Array();
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
      throw new Error(`Number required for replication. Got ${b} instead.`);
    }
  } else {
    console.error("Not supported for values","a:",a,"b:",b);
    throw new Error(`Cannot multiply ${formatValue(a,true)} * ${formatValue(b,true)}`);
  }
}

function power(a: any, b: any): number {
  if (typeof a === "number" && typeof b === "number") {
    return Math.pow(a, b);
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error(`Cannot raise to the power ${formatValue(a,true)} ^ ${formatValue(b,true)}`);
  }
}

function modulus(a: any, b: any): number {
  if (typeof a === "number" && typeof b === "number") {
    return a % b;
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error(`Cannot perform modulus ${formatValue(a,true)} % ${formatValue(b,true)}`);
  }
}

function logic_and(a: any, b: any): number {
  a = toBooleanNr(a);
  b = toBooleanNr(b);
  if (typeof a === "number" && typeof b === "number") {
    return absClamp01(a * b);
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error(`Cannot perform ${formatValue(a,true)} && ${formatValue(b,true)}`);
  }
}

function logic_or(a: any, b: any): number {
  a = toBooleanNr(a);
  b = toBooleanNr(b);
  if (typeof a === "number" && typeof b === "number") {
    return absClamp01(a + b - a * b);
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new Error(`Cannot perform ${formatValue(a,true)} || ${formatValue(b,true)}`);
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

function mapAccess(mapObj: Map<any, any>, key: any): any {
  if (mapObj.has(key)) {
    return mapObj.get(key);
  } else if (mapObj.has("__isa")) {
    const parentMap = mapObj.get("__isa");
    return mapAccess(parentMap, key); 
  } else {
    throw new Error(`Map has no property "${key}".`);
  }
}

function toBooleanNr(value: any): number {
  if (value === null) {
    return 0;
  } else if (typeof value == "number" ) {
    return value;
  } else if (value instanceof Array) {
    return value.length;
  } else if (typeof value === "string") {
    return value.length > 0 ? 1 : 0;
  } else if (value instanceof Map) {
    return value.size > 0 ? 1 : 0;
  } else {
    throw new Error("Type not supported: " + value);
  }
}

function toString(a: any): string {
  if (typeof a === "number") {
    return "" + a;
  } else if (typeof a === "string") {
    return a;
  } else if (a instanceof Array) {
    return formatValue(a);
  } else {
    throw new Error("Don't know how to make a string out of: " + a);
  }
}
