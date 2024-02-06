import { TokenType } from "../parser/tokenTypes";
import { BoundFunction } from "./funcdef";
import { MSMap, MSMapFactory } from "./msmap";
import { Processor } from "./processor";

export class RuntimeError extends Error {
  
  constructor(private baseMsg: string) {
    super(`Runtime Error: ${baseMsg}`);
  }

  setSourceLocation(fileName?: string, lineNr?: number) {
    let location: string;
    if (fileName !== undefined && lineNr !== undefined) {
      location = ` [${fileName} line ${lineNr}]`;
    } else if (lineNr !== undefined) { 
      location = ` [line ${lineNr}]`;
    } else {
      location = "";
    }
    
    const msg = `Runtime Error: ${this.baseMsg}${location}`;
    this.message = msg;
  }
  
}

type IndexedCollection = {
  length: number;
}

type Concatenable = {
  concat(a: any): any;
}

export function notEquals(a: any, b: any): number {
  return equals(a, b) == 1 ? 0 : 1; 
}

export function equals(a: any, b: any, recursionDepth: number = 16): number {
  if (recursionDepth < 0) {
    return 1;
  }
  // JavaScript does not compare Arrays the way we want
  // so we have to implement our own version.
  if (a instanceof Array && b instanceof Array) {
    if (a.length !== b.length) {
      return 0;
    } else {
      for (let i = 0; i < a.length; i++) {
        if (a[i] === b[i]) {
          continue;
        }
        if (equals(a[i], b[i], recursionDepth - 1) === 0) {
          return 0;
        }
      }
      return 1;
    }
  } else if (a instanceof MSMap && b instanceof MSMap) {
    if (a.size() !== b.size()) {
      return 0;
    } else {
      for (let aKey of a.keys()) {
        if (!b.has(aKey)) {
          return 0;
        }
        const aValue = a.get(aKey);
        const bValue = b.get(aKey);
        if (equals(aValue, bValue, recursionDepth - 1)) {
          continue;
        } else if (equals(aValue, bValue, recursionDepth - 1) !== 1) {
          return 0;
        }
      }
      return 1;
    }
  } else {
    return a === b ? 1 : 0;
  }
}

export function isaEquals(vm: Processor, value: any, type: any): number {
  if (value === null) {
    return type === null ? 1 : 0;
  } else if (type === null) {
    return 0;
  } else if (typeof value === "number") {
    return type === vm.numberCoreType ? 1 : 0;
  } else if (typeof value === "string") {
    return type === vm.stringCoreType ? 1 : 0;
  } else if (value instanceof Array) {
    return type === vm.listCoreType ? 1 : 0;
  } else if (value instanceof MSMap) {
    return value.isaEquals(type);
  } else if (value instanceof BoundFunction) {
    return type === vm.funcRefCoreType ? 1 : 0;
  } else {
    return 0;
  }
}

export function greaterEquals(a: any, b: any): number | null {
  if (typeof a === "number" && typeof b === "number") {
    return a >= b ? 1 : 0;
  } else if (typeof a === "string" && typeof b === "string") {
    return a >= b ? 1 : 0;
  } else {
    return null;
  }
}

export function greaterThan(a: any, b: any): number | null {
  if (typeof a === "number" && typeof b === "number") {
    return a > b ? 1 : 0;
  } else if (typeof a === "string" && typeof b === "string") {
    return a > b ? 1 : 0;
  } else {
    return null;
  }
}

export function lessEquals(a: any, b: any): number | null {
  if (typeof a === "number" && typeof b === "number") {
    return a <= b ? 1 : 0;
  } else if (typeof a === "string" && typeof b === "string") {
    return a <= b ? 1 : 0;
  } else {
    return null;
  }
}

export function lessThan(a: any, b: any): number | null {
  if (typeof a === "number" && typeof b === "number") {
    return a < b ? 1 : 0;
  } else if (typeof a === "string" && typeof b === "string") {
    return a < b ? 1 : 0;
  } else {
    return null;
  }
}

export function chainedComparison(values: any[], operators: string[]): number {
  const pairCount = operators.length;
  // Evaluate in pairs
  for (let i = 0; i < pairCount; i++) {
    const operator = operators[i];
    const left = values[i];
    const right = values[i+1];
    let result: number | null;
    if (operator === "==") {
      result = equals(left, right);
    } else if (operator === "!=") {
      result = notEquals(left, right);
    } else if (operator === ">") {
      result = greaterThan(left, right);
    } else if (operator === ">=") {
      result = greaterEquals(left, right);
    } else if (operator === "<") {
      result = lessThan(left, right);
    } else if (operator === "<=") {
      result = lessEquals(left, right);
    } else {
      throw new RuntimeError("Invalid operator");
    }
    if (!result) {
      return 0;
    }
  }
  return 1;
}

export function add(mapFactory: MSMapFactory, a: any, b: any): any {
  if (typeof a === "number" && typeof b === "number") {
    // Perform arithmetic addition
    return a + b
  } else if (typeof a === "string" || typeof b === "string") {
    // Convert both values to String and concatenate
    return toStr(a) + toStr(b);
  } else if (a instanceof Array) {
    if (b instanceof Array) {
      return a.concat(b);
    } else {
      throw new RuntimeError(`Got ${b} instead of another List`);
    }
  } else if (a instanceof MSMap) {
    if (b instanceof MSMap) {
      const combined = mapFactory.newMap();
      for (let e of a.entries()) {
        combined.set(e.key,e.value);
      }
      for (let e of b.entries()) {
        combined.set(e.key,e.value);
      }
      return combined;
    } else {
      throw new RuntimeError(`Got ${toStr(b)} where a Map was required`);
    }
  } else if (a === null) {
    return null;
  } else if (typeof a === "number" && b === null) {
    return a;
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new RuntimeError(`Cannot add ${formatValue(a,true)} + ${formatValue(b,true)}`);
  }
}

export function subtract(a: any, b: any): any {
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
  } else if (a === null) {
    return null;
  } else if (typeof a === "number" && b === null) {
    return a;
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new RuntimeError(`Cannot subtract ${formatValue(a,true)} - ${formatValue(b,true)}`);
  }
}

export function divide(a: any, b: any): number | null {
  if (typeof a === "number" && typeof b === "number") {
    return a / b
  } else if (a === null) {
    return null;
  } else if (typeof a === "number" && b === null) {
    return a / 0;
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new RuntimeError(`Cannot divide ${formatValue(a,true)} / ${formatValue(b,true)}`);
  }
}

export function multiply(a: any, b: any): any {
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
      throw new RuntimeError(`Number required for replication. Got ${b} instead.`);
    }
  } else if (a === null) {
    return null;
  } else if (typeof a === "number" && b === null) {
    return 0;
  } else {
    console.error("Not supported for values","a:",a,"b:",b);
    throw new RuntimeError(`Cannot multiply ${formatValue(a,true)} * ${formatValue(b,true)}`);
  }
}

export function power(a: any, b: any): number | null {
  if (typeof a === "number" && typeof b === "number") {
    return Math.pow(a, b);
  } else if (a === null) {
    return null;
  } else if (typeof a === "number" && b === null) {
    return 1;
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new RuntimeError(`Cannot raise to the power ${formatValue(a,true)} ^ ${formatValue(b,true)}`);
  }
}

export function modulus(a: any, b: any): number | null {
  if (typeof a === "number" && typeof b === "number") {
    return a % b;
  } else if (a === null) {
    return null;
  } else if (typeof a === "number" && b === null) {
    return a % 0;
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new RuntimeError(`Cannot perform modulus ${formatValue(a,true)} % ${formatValue(b,true)}`);
  }
}

export function logic_and(a: any, b: any): number {
  a = toBooleanNr(a);
  b = toBooleanNr(b);
  if (typeof a === "number" && typeof b === "number") {
    return absClamp01(a * b);
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new RuntimeError(`Cannot perform ${formatValue(a,true)} && ${formatValue(b,true)}`);
  }
}

export function logic_or(a: any, b: any): number {
  a = toBooleanNr(a);
  b = toBooleanNr(b);
  if (typeof a === "number" && typeof b === "number") {
    return absClamp01(a + b - a * b);
  } else {
    console.info("Not supported for values","a:",a,"b:",b);
    throw new RuntimeError(`Cannot perform ${formatValue(a,true)} || ${formatValue(b,true)}`);
  }
}

export function absClamp01(value: number): number {
  if (value < 0) value = -value;
  if (value > 1) return 1;
  return value;
}

export function slice(vm: Processor, sliceTarget: any, startIdx: number, endIdx: number): any {
  // Check list-target
  if (!(sliceTarget instanceof Array || typeof sliceTarget === "string")) {
    throw new RuntimeError(`Slice target must be List or String [line ${vm.getCurrentSrcLineNr()}]`);
  }
  // Check / compute indexes
  if (startIdx !== null) {
    checkInt(startIdx, `Slice-start should be an integer value [line ${vm.getCurrentSrcLineNr()}]`);
    startIdx = computeSliceIndex(sliceTarget, startIdx);
  } else {
    // Take slice from the beginning
    startIdx = 0;
  }
  if (endIdx !== null) {
    checkInt(endIdx, `Slice-end should be an integer value [line ${vm.getCurrentSrcLineNr()}]`);
    endIdx = computeSliceIndex(sliceTarget, endIdx);
  } else {
    // Take slice to the end
    endIdx = sliceTarget.length;
  }
  // Compute slice
  const newCollection = sliceTarget.slice(startIdx, endIdx);
  return newCollection;
}

// Here it's important that the index is valid and within the access-target
export function computeAccessIndex(accessTarget: IndexedCollection, index: number): number {
  const intIdx = toIntegerValue(index);
  // Compute effective index
  const effectiveIndex = (intIdx < 0) ? intIdx + accessTarget.length : intIdx;
  // Check bounds
  if (effectiveIndex < 0 || effectiveIndex >= accessTarget.length) {
    throw new RuntimeError(`Index Error (list index ${index} out of range)`);
  }
  return effectiveIndex;
}

// Here we can be flexible, adjust values and allow index to be == collection.length
export function computeSliceIndex(accessTarget: IndexedCollection, index: number): number {
  // Compute effective index
  const effectiveIndex = (index < 0) ? index + accessTarget.length : index;
  // Adjust values
  if (effectiveIndex < 0) {
    return 0;
  } else if (effectiveIndex >= accessTarget.length) {
    return accessTarget.length;
  }
  // Otherwise return as calculated
  return effectiveIndex;
}

export function computeMathAssignValue(mapFactory: MSMapFactory, currentValue: any, opTokenType: TokenType, operand: any): any {
  switch(opTokenType) {
    case TokenType.PLUS_ASSIGN:
      return add(mapFactory, currentValue, operand);
    case TokenType.MINUS_ASSIGN:
      return subtract(currentValue, operand);
    case TokenType.DIV_ASSIGN:
      return divide(currentValue, operand);
    case TokenType.MULT_ASSIGN:
      return multiply(currentValue, operand);
    case TokenType.MOD_ASSIGN:
      return modulus(currentValue, operand);
    case TokenType.POW_ASSIGN:
      return power(currentValue, operand);
    default:
      throw new RuntimeError("Invalid token-type: " + TokenType[opTokenType]);
  }
}

export function toBooleanNr(value: any): number {
  if (value === null) {
    return 0;
  } else if (typeof value == "number" ) {
    return value;
  } else if (value instanceof Array) {
    return value.length;
  } else if (typeof value === "string") {
    return value.length > 0 ? 1 : 0;
  } else if (value instanceof MSMap) {
    return value.size() > 0 ? 1 : 0;
  } else {
    throw new RuntimeError("Type not supported: " + value);
  }
}

export function toStr(a: any): string {
  if (typeof a === "number") {
    return "" + a;
  } else if (typeof a === "string") {
    return a;
  } else {
    return formatValue(a);
  }
}

// Not the same as trying to convert to number (e.g. `val("3")`)
export function toNumberValue(value: any): number {
  if (typeof value === "number" ) {
    return value;
  } else {
    return 0;
  }
}

export function toIntegerValue(value: any): number {
  if (typeof value == "number" ) {
    return Math.trunc(value);
  } else {
    return 0;
  }
}

export function toTwoNumbers(value: any): [number, number] {
  let a: number;
  let b: number;
  if (value instanceof Array) {
    a = toNumberValue(value[0]);
    b = toNumberValue(value[1]);
  } else {
    const n = toNumberValue(value);
    a = n;
    b = n;
  }
  return [a, b];
}

export function round(n: any, decimalPlaces: any): number | undefined {
  if (typeof n === "number" && typeof decimalPlaces === "number") {
    if (decimalPlaces >= 0) {
      const places = Math.pow(10, decimalPlaces);      
      return Math.round(n * places) / places;
    } else {
      const pow10Nr = Math.pow(10, -decimalPlaces);
      return Math.round(n / pow10Nr) * pow10Nr;
    }
  } else {
    return undefined;
  }
}

export function hashCode(value: any, recursionDepth: number = 16): number {
  if (value === null) {
    return -1;
  } else if (value instanceof Array) {
    return listHashCode(value, recursionDepth - 1);
  } else if (value instanceof MSMap) {
    return mapHashCode(value, recursionDepth - 1);
  } else {
    const valueStr = toStr(value);
    return stringHashCode(valueStr);
  }
}

export function listHashCode(list: Array<any>, recursionDepth: number = 16): number {
  let result = hashCode(list.length);
  if (recursionDepth < 1) {
    return result;
  }
  for (let i = 0; i < list.length; i++) {
    const value = list[i];
    if (value != null) {
      result ^= hashCode(value, recursionDepth - 1);
    }
  }
  return result;
}

export function mapHashCode(map: MSMap, recursionDepth: number = 16) {
  let result = stringHashCode(toStr(map.size));
  if (recursionDepth < 0) {
    return result;
  }
  for (let {key, value} of map.entries()) {
    result ^= hashCode(key, recursionDepth - 1);
    if (value != null) {
      result ^= hashCode(value, recursionDepth - 1);
    }
  }
  return result;
}

export function stringHashCode(str: string): number {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
      let chr = str.charCodeAt(i);
      hash = (hash << 5) - hash + chr;
      hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

export function getRandomInt(vm: Processor, max: number): number { 
  return Math.floor(vm.random() * max);
}

export function checkRange(i: number, min: number, max: number, desc: string = "index") {
  if (i < min || i > max) {
    throw new RuntimeError(`Index Error: ${desc} (${i}) out of range (${min} to ${max})`);
  }
}

export function checkNumber(arg: any, errorMsg: string, vm: Processor|null = null) {
  if (Number.isFinite(arg)) {
    return;
  } else if (vm instanceof Processor) {
    throw new RuntimeError(errorMsg);
  } else {
    throw new RuntimeError(errorMsg);
  }
}

export function checkInt(arg: any, errorMsg: string, vm: Processor|null = null) {
  if (Number.isInteger(arg)) {
    return;
  } else if (vm instanceof Processor) {
    throw new RuntimeError(errorMsg);
  } else {
    throw new RuntimeError(errorMsg);
  }
}

export function isNullOrEmpty(str: string): boolean {
  if (str === null) {
    return true;
  } else if (typeof str === "string") {
    return str === "";
  } else {
    throw new RuntimeError("Invalid argument: " + str);
  }
}


export function formatValue(value: any, quoteStrings: boolean = false, depth: number = 16): string {
  let text = "";
  if (typeof value === "number") {
    text = formatNumber(value);
  } else if (value instanceof Array) {
    if (depth < 0 ) {
      return "[ a List ]";
    }
    const formattedValues = [];
    for (const e of value) {
      formattedValues.push(formatValue(e, true, depth - 12));
    }
    text = "[" + formattedValues.join(", ") + "]";
  } else if (value instanceof MSMap) {
    if (depth < 0 ) {
      return "{ a Map }";
    }
    const formattedPairs = [];
    for (let e of value.entries()) {
      const formattedKey = formatValue(e.key, true, depth - 15);
      const formattedValue = formatValue(e.value, true, depth - 14);
      const formattedPair = formattedKey + ": " + formattedValue;
      formattedPairs.push(formattedPair);
    }
    text = "{" + formattedPairs.join(", ") + "}";
  } else if (typeof(value) === "string" && quoteStrings) {
    text = "\"" + value + "\"";
  } else if (typeof(value) === "boolean") {
    return value ? "1" : "0";
  } else if (value instanceof BoundFunction) {
    const formattedArgs: string[] = [];
    for (let arg of value.funcDef.arguments) {
      if (arg.defaultValue !== undefined) {
        formattedArgs.push(`${arg.name}=${arg.defaultValue}`);
      } else {
        formattedArgs.push(`${arg.name}`);
      }
    }
    const joinedArgs = formattedArgs.join(", ");
    return `FUNCTION(${joinedArgs})`;
  } else {
    text = "" + value;
  }
  return text;
}

function formatNumber(value: number): string {
  const isFloat = !Number.isInteger(value) && Number.isFinite(value);
  let text: string = "";
  if (isFloat) {
    if (value > 1E10 || value < -1E10 || (value < 1E-6 && value > -1E-6)) {
      // Format very large or small numbers in exponential form
      text = value.toExponential(6);
      // Pad exponential with leading zero if only one digit
      text = text.replace(/[eE]([-+])(\d)$/,"E$10$2")
    } else {
      text = "" + (round(value, 6) || 0);
    }
  } else {
    text = value.toString();
  }
  return text;
}
