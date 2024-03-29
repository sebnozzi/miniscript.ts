import { newRandomGenerator } from "../lib/random";
import { Stack } from "../lib/stack";
import { TokenType } from "../parser/tokenTypes";
import { BC, hasCallPotential } from "./bytecodes";
import { Code } from "./code";
import { Context } from "./context";
import { ForLoop, ForLoopContext } from "./forloop";
import { Frame } from "./frame";
import { FuncDefArg, FuncDef, BoundFunction } from "./funcdef";
import { MSMap, MSMapFactory } from "./msmap";
import { ProcessorState } from "./processorState";
import { RuntimeError, computeAccessIndex, computeMathAssignValue, slice, chainedComparison, equals, isaEquals, greaterEquals, greaterThan, lessEquals, lessThan, toBooleanNr, add, subtract, multiply, divide, power, modulus, logic_and, logic_or } from "./runtime";
import { parseSignature } from "./signatureParser";

export type TxtCallback = (txt: string) => any;

export const MAX_ISA_RECURSION_DEPTH = 16;

export enum RunMode {
  STANDARD_MODE,
  DEBUG_MODE,
  COOP_MODE,
}

export class Processor implements MSMapFactory {

  // Special value to indicate that a call should be aborted.
  // Intrinsics may return this.
  static abortCallValue: Object = {};

  // The instruction pointer. Points to the position in code.
  ip: number;
  // The operation stack. Used for calculations and passing values.
  opStack: Stack<any>;
  // The code to execute.
  code: Code;
  // The current context.
  context: Context;
  // The current for-loop context.
  forLoopContext: ForLoopContext;
  // The global context.
  globalContext: Context;
  // Intrinsics stored here
  intrinsicsMap: Map<string, BoundFunction>;
  // Core-types
  listCoreType: MSMap;
  mapCoreType: MSMap;
  stringCoreType: MSMap;
  numberCoreType: MSMap;
  funcRefCoreType: MSMap;
  // Stack of frames (waiting to be returned to; not the current one).
  savedFrames: Stack<Frame>;
  // Counter used to return control back to host.
  cycleCount: number;
  // Max count of cycles per "burst"
  maxCount: number = 73681;
  // Callback when execution resumes after being suspended
  onResumingExecution: () => void;
  // Callback when processing done
  onFinished: () => void;
  // Random number generator
  rndGenerator: Function;
  // Timestamp when a script starts executing. Used in `time`.
  executionStartTime: number;
  // Flag to know when execution is suspended (e.g. waiting on a promise)
  suspended: boolean = false;
  // Flag to know when execution is completely halted (e.g. due to error or `exit`)
  halted: boolean = false;
  // Maximum depth of call stack
  maxCallStackDepth: number = 2000;
  // If true, continue running after being suspended.
  // Otherwise do not run. This is the case when running in a 
  // debugging session or cooperatively.
  runAfterSuspended: boolean;
  // Last pop/discard value
  // Useful when evaluating code.
  lastValue: any;

  constructor(public stdoutCallback: TxtCallback, public stderrCallback: TxtCallback) {
    this.runAfterSuspended = true;
    this.code = new Code();
    this.ip = 0;
    this.globalContext = new Context(this);
    this.intrinsicsMap = new Map();
    this.listCoreType = new MSMap(this);
    this.mapCoreType = new MSMap(this);
    this.stringCoreType = new MSMap(this);
    this.numberCoreType = new MSMap(this);
    this.funcRefCoreType = new MSMap(this);
    this.context = this.globalContext;
    this.forLoopContext = new ForLoopContext();
    this.savedFrames = new Stack<Frame>();
    this.opStack = new Stack();
    this.cycleCount = 0;
    this.onResumingExecution = () => {};
    this.onFinished = () => {};
    this.rndGenerator = newRandomGenerator();
    this.executionStartTime = 0;
    this.lastValue = undefined;
  }

  prepareForRunning(code: Code, context: Context | null = null, globalContext: Context | null = null) {
    this.code = code;
    this.ip = 0;
    this.cycleCount = 0;

    if (globalContext !== null) {
      this.globalContext = globalContext;
    }

    if (context === null) {
      this.context = this.globalContext;
    } else {
      this.context = context;
    }

    this.savedFrames = new Stack<Frame>();
    this.opStack = new Stack();
    this.suspended = false;
    this.halted = false;
    this.lastValue = undefined;
  }

  setRunAfterSuspended(flag: boolean) {
    this.runAfterSuspended = flag;
  }

  getLastValue(): any {
    return this.lastValue;
  }

  run() {
    this.executionStartTime = performance.now();
    this.runUntilDone();
  }

  addIntrinsic(signature: string, impl: Function) {
    const [fnName, argNames, defaultValues] = parseSignature(signature);
    const intrinsicFn = this.makeIntrinsicFn(impl, argNames, defaultValues);
    this.intrinsicsMap.set(fnName, intrinsicFn);
  }

  addMapIntrinsic(target: MSMap, signature: string, impl: Function) {
    const [fnName, argNames, defaultValues] = parseSignature(signature);
    const intrinsicFn = this.makeIntrinsicFn(impl, argNames, defaultValues);
    target.set(fnName, intrinsicFn);
  }

  attachExistingIntrinsic(target: MSMap, name: string, boundFunc: BoundFunction) {
    target.set(name, boundFunc);
  }

  makeIntrinsicFn(impl: Function, argNames: string[] = [], defaultValues: any[] = []): BoundFunction {
    const args = [];
    const argCount = impl.length;

    if (argNames.length !== argCount || argNames.length !== defaultValues.length) {
      throw new Error("Length mismatch in argument count! Check function signature.");
    }

    for (let argIdx = 0; argIdx < argCount; argIdx++) {
      const argName = argNames[argIdx];
      const defaultValue = defaultValues[argIdx];
      const arg = new FuncDefArg(argName, defaultValue);
      args.push(arg);
    }
    const funcDef = new FuncDef(args, impl);
    const boundFunc = new BoundFunction(funcDef, this.globalContext);
    return boundFunc;
  }

  newMap(): MSMap {
    return new MSMap(this);
  }

  initRandomGenerator(seed: number | string) {
    this.rndGenerator = newRandomGenerator(seed);
  }

  random() {
    return this.rndGenerator();
  }

  runUntilDone() {
    this.runSomeCycles();
    // If not waiting on a Promise or finished
    // running, schedule the next execution burst.
    if (this.isRunning()) {
      setTimeout(() => {
        this.runUntilDone()
      }, 0);
    }
  }

  runSomeCycles() {
    if (this.isRunning()) {
      try {
        this.executeCycles();
      } catch(e: any) {
        this.reportError(e);
        this.stopRunning();
        return;
      }
    }

    if (this.isFinished()) {
      // Call after program ends normally
      this.cleanupAfterRunning();
    }
  }

  runOneCycle() {
    this.executeCycles(1);
  }

  private reportError(e: any) {
    if (e instanceof RuntimeError) {
      e.setSourceLocation(this.getCurrentSrcFileName(), this.getCurrentSrcLineNr());
      const fileName = this.getCurrentSrcFileName();
      e.setSourceLocation(fileName, this.getCurrentSrcLineNr());
    }
    if (e["message"]) {
      this.stderrCallback(e.message);
    }
    console.error(e);
  }

  private executeCycles(maxCount: number | null = null) {
    maxCount = maxCount !== null ? maxCount : this.maxCount;
    this.cycleCount = 0;
    while(this.cycleCount < maxCount) {
      // Finish if IP > len(opcodes)
      if (this.ip >= this.code.opCodes.length) {
        break
      }
      // Process OpCode
      switch (this.code.opCodes[this.ip]) {
        case BC.CALL: {
          const funcName: string = this.code.arg1[this.ip] as string;
          const paramCount: number = this.code.arg2[this.ip] as number;
          // Pop params
          const params = this.opStack.popN(paramCount);

          const optValue: any | undefined = this.context.getOpt(funcName);
          if (optValue === undefined) {
            throw new RuntimeError(`Could not resolve "${funcName}"`);
          }
          const resolvedFunc: any = optValue;
          this.performCall(resolvedFunc, params);
          break;
        }
        case BC.FUNCREF_CALL: {
          const paramCount: number = this.code.arg1[this.ip] as number;
          // Pop params
          const params = this.opStack.popN(paramCount);
          // Pop call target
          const maybeFuncRef: any = this.opStack.pop();
          this.performCall(maybeFuncRef, params);
          break;
        }
        case BC.PROPERTY_CALL: {
          const paramCount: number = this.code.arg1[this.ip] as number;
          // Pop params
          const params = this.opStack.popN(paramCount);
          // Pop property name
          const methodName = this.opStack.pop();
          // Pop call target
          const callTarget = this.opStack.pop();

          let srcMap: MSMap | null = null;
          let resolvedMethod: any;
          if (callTarget instanceof MSMap) {
            [resolvedMethod, srcMap] = callTarget.getWithSource(methodName);
          } else {
            // Lookup in base type
            const baseTypeMap = this.selectCoreTypeMap(callTarget);
            resolvedMethod = baseTypeMap.get(methodName);
          }
          this.performCall(resolvedMethod, params, callTarget, srcMap);
          break;
        }
        case BC.RETURN: {
          // Pop frame if we are inside of a function call.
          if (this.savedFrames.count() > 0) {
            this.popFrame();
          } else {
            // Otherwise pop return value
            this.opStack.pop();
            // and treat it as a no-op.
            this.ip += 1;
          }
          break;
        }
        case BC.ASSIGN_LOCAL: {
          const varName: string = this.code.arg1[this.ip] as string;
          const valueToAssign = this.opStack.pop();
          this.context.setLocal(varName, valueToAssign)
          this.ip += 1;
          break;
        }
        case BC.ASSIGN_INDEXED: {
          // pop target
          const assignTarget = this.opStack.pop();
          // pop value
          const valueToAssign = this.opStack.pop();
          // pop index
          let index = this.opStack.pop();

          const isString = typeof assignTarget === "string";
          const isList = assignTarget instanceof Array;
          const isMap = assignTarget instanceof MSMap;

          if (isList) {
            const effectiveIndex = computeAccessIndex(assignTarget, index);
            assignTarget[effectiveIndex] = valueToAssign;
          } else if(isMap) {
            assignTarget.set(index, valueToAssign);
          } else if(isString) {
            throw new RuntimeError("Cannot assign to String (immutable)");
          } else {
            throw new RuntimeError("Cannot set to element of this type");
          }

          this.ip += 1;
          break;
        }
        case BC.DOT_ASSIGN : {
          const propertyName: string = this.code.arg1[this.ip];
          const assignTarget = this.opStack.pop();
          const valueToAssign = this.opStack.pop();

          if (!(assignTarget instanceof MSMap)) {
            throw new RuntimeError(`Assignment target must be a Map`);
          }

          assignTarget.set(propertyName, valueToAssign);
          this.ip += 1;
          break;         
        }
        case BC.MATH_ASSIGN_LOCAL: {
          const varName: string = this.code.arg1[this.ip] as string;
          const opTokenType: TokenType = this.code.arg2[this.ip] as TokenType;
          const operand = this.opStack.pop();
          // Get existing value
          const existingValue = this.context.getOpt(varName);
          if (existingValue !== undefined) {
            const finalValue = computeMathAssignValue(this, existingValue, opTokenType, operand);
            this.context.setLocal(varName, finalValue);
          } else {
            throw new RuntimeError(`Undefined Local Identifier: '${varName}' is unknown in this context`);
          }
          this.ip += 1;
          break;
        }
        case BC.MATH_ASSIGN_INDEXED: {
          const opTokenType: TokenType = this.code.arg1[this.ip] as TokenType;
          // pop value
          const operand = this.opStack.pop();
          // pop index
          let index = this.opStack.pop();
          // pop target
          const assignTarget = this.opStack.pop();

          const isString = typeof assignTarget === "string";
          const isList = assignTarget instanceof Array;
          const isMap = assignTarget instanceof MSMap;

          if (isList) {
            const effectiveIndex = computeAccessIndex(assignTarget, index);
            const currentValue = assignTarget[effectiveIndex];
            const finalValue = computeMathAssignValue(this, currentValue, opTokenType, operand);
            assignTarget[effectiveIndex] = finalValue;
          } else if(isMap) {
            const currentValue = assignTarget.get(index);
            const finalValue = computeMathAssignValue(this, currentValue, opTokenType, operand);
            assignTarget.set(index, finalValue);
          } else if(isString) {
            throw new RuntimeError("Cannot assign to String (immutable)");
          } else {
            throw new RuntimeError("Cannot set to element of this type");
          }

          this.ip += 1;
          break;
        }
        case BC.MATH_DOT_ASSIGN : {
          const propertyName: string = this.code.arg1[this.ip];
          const opTokenType: TokenType = this.code.arg2[this.ip] as TokenType;
          const operand = this.opStack.pop();
          const assignTarget = this.opStack.pop();

          if (!(assignTarget instanceof MSMap)) {
            throw new RuntimeError(`Assignment target must be a Map`);
          }

          const currentValue = assignTarget.get(propertyName);
          const finalValue = computeMathAssignValue(this, currentValue, opTokenType, operand);
          assignTarget.set(propertyName, finalValue);

          this.ip += 1;
          break;         
        }

        case BC.EVAL_ID: {
          const identifier = this.code.arg1[this.ip];
          const isFuncRef: boolean = this.code.arg2[this.ip];
          const optValue = this.context.getOpt(identifier);
          if (optValue !== undefined) {
            this.callOrPushValue(optValue, isFuncRef);
          } else {
            throw new RuntimeError(`Undefined Identifier: '${identifier}' is unknown in this context`);
          }
          break;
        }
        case BC.INDEXED_ACCESS: {
          const isFuncRef: boolean = this.code.arg1[this.ip];
          let index = this.opStack.pop();
          const accessTarget = this.opStack.pop();

          const isString = typeof accessTarget === "string";
          const isList = accessTarget instanceof Array;
          const isMap = accessTarget instanceof MSMap;

          let value: any;
          let srcMap: MSMap | null = null;

          if (isList || isString) {
            if (typeof index === "number") {
              const effectiveIndex = computeAccessIndex(accessTarget, index);
              value = accessTarget[effectiveIndex];
            } else if (isList) {
              [value, srcMap] = this.listCoreType.getWithSource(index);
            } else if (isString) {
              [value, srcMap] = this.stringCoreType.getWithSource(index);
            } else {
              throw new Error("Uncovered case");
            }
          } else if(isMap) {
            [value, srcMap] = accessTarget.getWithSource(index);
          } else if (typeof index === "number") {
            throw new RuntimeError(`Null Reference Exception: can't index into null`);
          } else {
            throw new RuntimeError(`Type Error (while attempting to look up ${index})`);
          }

          this.callOrPushValue(value, isFuncRef, accessTarget, srcMap);
          break;
        }
        case BC.DOT_ACCESS : {
          const propertyName: string = this.code.arg1[this.ip];
          const isFuncRef: boolean = this.code.arg2[this.ip];
          const accessTarget = this.opStack.pop();

          let value: any;
          let srcMap: MSMap;
          if (accessTarget instanceof MSMap) {
            [value, srcMap] = accessTarget.getWithSource(propertyName);
          } else if (accessTarget === null) {
            throw new RuntimeError(`Type Error (while attempting to look up ${propertyName})`);
          } else {
            // Lookup in base type - redefine access-target
            srcMap = this.selectCoreTypeMap(accessTarget);
            value = srcMap.get(propertyName);
          }
          this.callOrPushValue(value, isFuncRef, accessTarget, srcMap);
          break;         
        }
        case BC.SUPER_DOT_ACCESS : {
          const propertyName: string = this.code.arg1[this.ip];
          const isFuncRef: boolean = this.code.arg2[this.ip];
          const superMap = this.context.getOpt("super");
          const selfMap = this.context.getOpt("self");

          if (superMap === undefined) {
            throw new RuntimeError(`Undefined Identifier: 'super' is unknown in this context`);
          }
          if (selfMap === undefined) {
            throw new RuntimeError(`Undefined Identifier: 'self' is unknown in this context`);
          }

          let value: any;
          let srcMap: MSMap | null = null;
          if (superMap instanceof MSMap) {
            // Use the "superMap" only to lookup the value
            // But later call it with the "selfMap"
            [value, srcMap] = superMap.getWithSource(propertyName);
            if (value === undefined) {
              throw new RuntimeError(`Type Error (while attempting to look up ${propertyName})`);
            }
          } else if (superMap === null) {
            throw new RuntimeError(`Type Error (while attempting to look up ${propertyName})`);
          }

          // Note that the source-map and the super-map might not be
          // the same. Pass the source-map to compute a new "super".
          this.callOrPushValue(value, isFuncRef, selfMap, srcMap);
          break;         
        }
        case BC.SUPER_DOT_CALL: {
          const paramCount: number  = this.code.arg1[this.ip];

          const superMap = this.context.getOpt("super");
          const selfMap = this.context.getOpt("self");

          if (superMap === undefined) {
            throw new RuntimeError(`Undefined Identifier: 'super' is unknown in this context`);
          }
          if (selfMap === undefined) {
            throw new RuntimeError(`Undefined Identifier: 'self' is unknown in this context`);
          }

          // Pop params
          const params = this.opStack.popN(paramCount);
          // Pop property name
          const methodName = this.opStack.pop();

          let resolvedMethod: any;
          let srcMap: MSMap | null = null;
          if (superMap instanceof MSMap) {
            // Use the "superMap" only to lookup the value
            // But later call it with the "selfMap"
            [resolvedMethod, srcMap] = superMap.getWithSource(methodName);
            if (resolvedMethod === undefined) {
              throw new RuntimeError(`Type Error (while attempting to look up ${methodName})`);
            }
          } else if (superMap === null) {
            throw new RuntimeError(`Type Error (while attempting to look up ${methodName})`);
          }

          this.performCall(resolvedMethod, params, selfMap, srcMap);
          break;
        }
        case BC.SLICE_SEQUENCE: {
          // Pop parameters
          const endIdx = this.opStack.pop();
          const startIdx = this.opStack.pop();
          const sliceTarget = this.opStack.pop();
          const newCollection = slice(this, sliceTarget, startIdx, endIdx);
          // Push result
          this.opStack.push(newCollection);
          this.ip += 1;
          break;
        }
        case BC.CHAINED_COMPARISON: {
          const pairCount: number = this.code.arg1[this.ip];
          // Pop operators
          const operators: string[] = this.opStack.popN(pairCount);
          // Pop values
          const values: any[] = this.opStack.popN(pairCount + 1);
          // Calculate result
          const result = chainedComparison(values, operators);
          // Push result
          this.opStack.push(result);
          this.ip += 1;
          break;
        }
        case BC.PUSH: {
          const value: any = this.code.arg1[this.ip];
          // If it's a FuncDef, store as bound-function with the current context
          if (value instanceof FuncDef) {
            const boundFunction = new BoundFunction(value, this.context);
            this.opStack.push(boundFunction);
          } else {
            this.opStack.push(value);
          }
          this.ip += 1;
          break;
        }
        case BC.BUILD_LIST: {
          const elementCount: any = this.code.arg1[this.ip];
          const elements: any[] = this.opStack.popN(elementCount);
          this.opStack.push(elements);
          this.ip += 1;
          break;
        }
        case BC.BUILD_MAP: {
          const elementCount: any = this.code.arg1[this.ip];
          const elements: any[] = this.opStack.popN(elementCount * 2);
          const newMap = new MSMap(this);
          // Iterate over elements and process key/value
          // Advance by 2, processing in pairs
          for (let i = 0; i < elements.length; i += 2) {
            const mapKey = elements[i];
            const mapValue = elements[i+1];
            newMap.set(mapKey, mapValue);
          }
          this.opStack.push(newMap);
          this.ip += 1;
          break;
        }
        case BC.NEW_MAP: {
          const parentMap = this.opStack.pop();
          if (!(parentMap instanceof MSMap)) {
            throw new RuntimeError(`Operator "new" can only be used with Maps`);
          }
          const newMap = parentMap.newChildMap();
          this.opStack.push(newMap);                
          this.ip += 1;
          break;
        }
        case BC.COMPARE_EQ: {
          const valueB = this.opStack.pop()
          const valueA = this.opStack.pop()
          const result = equals(valueA, valueB)
          this.opStack.push(result)
          this.ip += 1
          break;
        }
        case BC.COMPARE_NE: {
          const valueB = this.opStack.pop();
          const valueA = this.opStack.pop();
          if (!equals(valueA, valueB)) {
            this.opStack.push(1)
          } else {
            this.opStack.push(0)
          }
          this.ip += 1
          break;
        }
        case BC.COMPARE_ISA: {
          const valueB = this.opStack.pop()
          const valueA = this.opStack.pop()
          const result = isaEquals(this, valueA, valueB)
          this.opStack.push(result)
          this.ip += 1
          break;
        }
        case BC.COMPARE_GE: {
          const valueB = this.opStack.pop()
          const valueA = this.opStack.pop()
          const result = greaterEquals(valueA, valueB)
          this.opStack.push(result)
          this.ip += 1
          break;
        }
        case BC.COMPARE_GT: {
          const valueB = this.opStack.pop()
          const valueA = this.opStack.pop()
          const result = greaterThan(valueA, valueB)
          this.opStack.push(result)
          this.ip += 1
          break;
        }
        case BC.COMPARE_LE: {
          const valueB = this.opStack.pop()
          const valueA = this.opStack.pop()
          const result = lessEquals(valueA, valueB)
          this.opStack.push(result)
          this.ip += 1
          break;
        }
        case BC.COMPARE_LT: {
          const valueB = this.opStack.pop()
          const valueA = this.opStack.pop()
          const result = lessThan(valueA, valueB)
          this.opStack.push(result)
          this.ip += 1
          break;
        }
        case BC.POP_JUMP_FALSE: {
          const jumpAddr = this.code.arg1[this.ip]
          let value = this.opStack.pop();
          value = toBooleanNr(value);
          if (value == 0) {
            this.ip = jumpAddr
          } else {
            this.ip += 1
          }
          break;
        }
        case BC.JUMP_IF_TRUE: {
          const jumpAddr = this.code.arg1[this.ip];
          // Leave value on the stack
          let value = this.opStack.peek();
          value = toBooleanNr(value);
          if (value == 1) {
            this.ip = jumpAddr
          } else {
            this.ip += 1
          }
          break;
        }
        case BC.JUMP_IF_FALSE: {
          const jumpAddr = this.code.arg1[this.ip];
          // Leave value on the stack
          let value = this.opStack.peek();
          value = toBooleanNr(value);
          if (value == 0) {
            this.ip = jumpAddr
          } else {
            this.ip += 1
          }
          break;
        }
        case BC.ADD_VALUES: {
          const valueInStack_2 = this.opStack.pop()
          const valueInStack_1 = this.opStack.pop()
          const result = add(this, valueInStack_1, valueInStack_2)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.SUBTRACT_VALUES: {
          const valueInStack_2 = this.opStack.pop()
          const valueInStack_1 = this.opStack.pop()
          const result = subtract(valueInStack_1, valueInStack_2)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.MULTIPLY_VALUES: {
          const valueInStack_2 = this.opStack.pop()
          const valueInStack_1 = this.opStack.pop()
          const result = multiply(valueInStack_1, valueInStack_2)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.DIVIDE_VALUES: {
          const valueInStack_2 = this.opStack.pop()
          const valueInStack_1 = this.opStack.pop()
          const result = divide(valueInStack_1, valueInStack_2)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.POWER_VALUES: {
          const valueInStack_2 = this.opStack.pop()
          const valueInStack_1 = this.opStack.pop()
          const result = power(valueInStack_1, valueInStack_2)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.MOD_VALUES: {
          const valueInStack_2 = this.opStack.pop()
          const valueInStack_1 = this.opStack.pop()
          const result = modulus(valueInStack_1, valueInStack_2)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.LOGIC_AND_VALUES: {
          const valueInStack_2 = this.opStack.pop()
          const valueInStack_1 = this.opStack.pop()
          const result = logic_and(valueInStack_1, valueInStack_2)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.LOGIC_OR_VALUES: {
          const valueInStack_2 = this.opStack.pop()
          const valueInStack_1 = this.opStack.pop()
          const result = logic_or(valueInStack_1, valueInStack_2)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.SUBTR_N: {
          const valueToSubtract = this.code.arg1[this.ip];
          const valueInStack = this.opStack.pop()
          const result = subtract(valueInStack, valueToSubtract)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.DIVIDE_N: {
          const dividend = this.code.arg1[this.ip];
          const valueInStack = this.opStack.pop()
          const result = divide(valueInStack, dividend)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.NEGATE_BOOLEAN: {
          const valueInStack = this.opStack.pop();
          const booleanNr = toBooleanNr(valueInStack);
          const result = booleanNr == 0 ? 1 : 0;
          this.opStack.push(result);
          this.ip += 1;
          break;
        }
        case BC.NEGATE_NUMBER: {
          const valueInStack = this.opStack.pop();
          if (typeof valueInStack !== "number") {
            throw new RuntimeError(`Value must be a number`);
          } else {
            const result = -1 * valueInStack;
            this.opStack.push(result);
            this.ip += 1;
            break;
          }
        }
        case BC.JUMP: {
          this.ip = this.code.arg1[this.ip]
          break;
        }
        case BC.POP: {
          // Pop and discard value
          if (this.opStack.lastValueUndefined) {
            this.opStack.pop();
            this.lastValue = undefined;
          } else {
            this.lastValue = this.opStack.pop();
          }
          this.ip += 1;
          break;
        }
        case BC.CREATE_FOR_LOOP: {
          const forLoopNr = this.code.arg1[this.ip];
          // Retrieve for-loop parameters
          const startAddr = this.opStack.pop();
          const endAddr = this.opStack.pop();
          const values = this.opStack.pop();
          const localVarName = this.opStack.pop();
          // Create for-loop in current context
          const forLoop = new ForLoop(this, startAddr, endAddr, localVarName, values);
          this.forLoopContext.registerForLoop(forLoopNr, forLoop);
          // Advance IP
          this.ip += 1;
          break;
        }
        case BC.ITERATE_FOR_LOOP: {
          const forLoopNr = this.code.arg1[this.ip];
          const forLoop = this.forLoopContext.getForLoop(forLoopNr);
          if (forLoop.isOver()) {
            this.ip = forLoop.endAddr;
            this.forLoopContext.deleteForLoop(forLoopNr);
          } else {
            const value = forLoop.iterate();
            // Assign to local variable
            this.context.setLocal(forLoop.localVarName, value);
            this.ip += 1;
          }
          break;
        }
        case BC.BREAK_FOR_LOOP: {
          const forLoopNr = this.code.arg1[this.ip];
          const forLoop = this.forLoopContext.getForLoop(forLoopNr);
          this.forLoopContext.deleteForLoop(forLoopNr);
          this.ip = forLoop.endAddr;
          break;
        }
        case BC.CONTINUE_FOR_LOOP: {
          const forLoopNr = this.code.arg1[this.ip];
          const forLoop = this.forLoopContext.getForLoop(forLoopNr);
          this.ip = forLoop.startAddr;
          break;
        }
        case BC.PRINT_TOP: {
          const value = this.opStack.pop()
          console.log("Value: " + value)
          this.ip += 1;
          break;
        }
        default: {
          console.log("ip:", this.ip);
          console.error("Bytecode not supported: ", this.code.opCodes[this.ip]);
          throw new RuntimeError("Bytecode not supported: " + this.code.opCodes[this.ip]);
        }
      } // switch
      this.cycleCount++;
    } // while
  } // executeCycles

  isRunning(): boolean {
    return !this.isFinished() && !this.isSuspended();
  }

  isFinished(): boolean {
    return this.ip >= this.code.opCodes.length;
  }

  isSuspended(): boolean {
    return this.suspended;
  }

  stopRunning() {
    this.forceFinish();
    this.cleanupAfterRunning();
  }

  private forceFinish() {
    this.opStack.clear();
    this.cycleCount = this.maxCount;
    this.ip = this.code.opCodes.length;
    this.halted = true;
  }

  private cleanupAfterRunning() {
    // Check that stack is balanced (empty)
    if (this.opStack.count() > 0 && !this.halted) {
      console.info("Stack: ", this.opStack);
      throw new RuntimeError("Stack was not empty!")
    }
    // Invoke callback
    this.onFinished();
  }

  runAtCurrentPosition(code: Code): Promise<void> {
    
    // Build promise which will be resolved when code
    // is done running.
    const promise = new Promise<void>((resolve) => {
      // Save current state
      const previousState = new ProcessorState(this);
      const currentContext = this.context;
      const currentGlobalContext = this.globalContext;
      // Reset current state
      ProcessorState.resetState(this);
      // Set running code at the current context
      this.prepareForRunning(code, currentContext, currentGlobalContext);
      // Setup onFinished callback
      this.onFinished = () => {
        if (!this.halted) {
          // Restore previous state if VM not halted
          previousState.restoreState(this);
        } else {
          // At least restore the "onFinished" which we modified
          this.onFinished = previousState.onFinished;
        }
        // Resolve promise
        resolve();
      };
      // Start executing
      this.runUntilDone();
    });

    return promise;
  }

  yieldExecution() {
    this.cycleCount = this.maxCount;
    this.suspended = false;
  }

  private suspendExecution() {
    this.cycleCount = this.maxCount;
    this.suspended = true;
  }

  private resumeExecution() {
    if (!this.suspended) {
      return;
    }
    this.suspended = false;
    // Only continue running if specified
    if (this.runAfterSuspended) {
      this.runUntilDone();
    }
    // Invoke callback
    this.onResumingExecution();
  }

  couldResultInCall(): boolean {
    const op = this.code.opCodes[this.ip];
    const result = hasCallPotential(op);
    return result;
  }

  pushFrame() {
    const frame = new Frame(this.code, this.ip, this.context, this.forLoopContext);
    this.savedFrames.push(frame);
    // Remove at some point?
    if (this.savedFrames.count() > this.maxCallStackDepth) {
      throw new RuntimeError("Call stack too deep");
    }
  }

  popFrame() {
    const frame = this.savedFrames.pop();
    this.ip = frame.ip;
    this.context = frame.context;
    this.forLoopContext = frame.forLoopContext;
    this.code = frame.code;
  }

  getCurrentSrcLineNr(): number | undefined {
    const optSrcMapEntry = this.code.srcMap.findEntry(this.ip);
    if (optSrcMapEntry !== null) {
      return optSrcMapEntry.srcLoc.start.row;
    } else {
      return undefined;
    }
  }

  getCurrentSrcFileName(): string | undefined {
    const srcFile = this.code.srcMap.srcFile;
    return srcFile;
  }

  private selectCoreTypeMap(accessTarget: any): MSMap {
    if (accessTarget instanceof Array) {
      return this.listCoreType;
    } else if (typeof accessTarget === "string") {
      return this.stringCoreType;
    } else if (accessTarget instanceof MSMap) {
      return this.mapCoreType;
    } else if (typeof accessTarget === "number") {
      return this.numberCoreType;
    } else {
      throw new RuntimeError(`No core-type map for value ${accessTarget}`);
    }
  }

  resolveIntrinsic(identifier: string): BoundFunction|undefined {
    const optIntrinsicFn = this.intrinsicsMap.get(identifier);
    return optIntrinsicFn;
  }

  private callOrPushValue(value: any, isFuncRef: boolean, accessSrc: any | undefined = undefined, srcMap: MSMap | null = null) {
    // If it's a function and we are not dealing with a function
    // reference, the function should be called.
    // The resulting value will be put in the stack instead.
    if (value instanceof BoundFunction && !isFuncRef) {
      this.performCall(value, [], accessSrc, srcMap);
    } else {
      // Otherwise use the value as-is
      this.opStack.push(value)
      this.ip += 1;
    }
  }

  private performCall(maybeFunction: any, paramValues: any[], dotCallTarget: any | undefined = undefined, srcMap: MSMap | null = null) {
    
    const paramCount = paramValues.length;

    if (!(maybeFunction instanceof BoundFunction)) {
      if (paramCount > 0) {
        throw new RuntimeError(`Too Many Arguments`);
      } else {
        throw new RuntimeError(`Attempting to call a non-function`);
      }
    }

    const boundFunc = maybeFunction as BoundFunction;
    const funcDef = boundFunc.funcDef;

    let funcArgCount = funcDef.argNames.length;

    let isNativeSelfFunction = (
      funcDef.isNative() 
      && dotCallTarget !== undefined
      && funcDef.argNames.length > 0
      && funcDef.argNames[0] === "self"
    );

    // Subtract one argument for instrinsic self-functions
    if (isNativeSelfFunction) {
      funcArgCount -= 1;
    }

    // If parameters missing, complete with default values
    if (paramCount > funcArgCount) {
      throw new RuntimeError(`Too many parameters calling function.`)
    } else if (paramCount < funcArgCount) {
      // Push the missing default argument values
      const missingArgCount = funcArgCount - paramCount;
      const defaultValues = funcDef.getLastNEffectiveDefaultValues(missingArgCount);
      for (let value of defaultValues) {
        paramValues.push(value);
      }
    }

    if (funcDef.isNative()) {
      const func = funcDef.getFunction();
      // Add dot-call target "manually", if self-function
      if (isNativeSelfFunction) {
        // The "self" parameter
        paramValues.unshift(dotCallTarget);
      }
      // Call with parameters
      const retVal = func.apply(this, paramValues);

      // Abort this call and return immediately
      if (retVal === Processor.abortCallValue) {
        return;
      }

      // Check if returned value is a Promise
      if (retVal instanceof Promise) {
        this.suspendUntilPromiseResolved(retVal);
      } else {
        // Return value is normal object
        // Push return value to stack
        this.opStack.push(retVal);
        // Advance IP
        this.ip += 1;
      }
    } else {
      // Function is a MiniScript-code function.
      // (not an intrinsic)

      // Let it return to the next bytecode after the call
      this.ip += 1;
      this.pushFrame();

      // Setup next frame
      this.code = funcDef.getCode();
      this.context = new Context(this, boundFunc.context);
      this.forLoopContext = new ForLoopContext();
      this.ip = 0;

      // Pop and set parameters as variables
      let argNames = funcDef.argNames;
    
      if (dotCallTarget !== undefined) {
        argNames = argNames.filter((n:string) => n !== "self");
      }

      for (let i = 0; i < argNames.length; i++) {
        const argName = argNames[i];
        const paramValue = paramValues[i];
        this.context.setLocal(argName, paramValue);
      }
      // Add dot-call target if any
      if (dotCallTarget !== undefined) {
        // The "self" value
        this.context.setLocal("self", dotCallTarget);
        // The "super" value
        if(srcMap !== null) {
          // The "source map" is where the bound-function was found.
          // Any calls to "super" refer to the isa-map above this one.
          if (srcMap.hasParent()) {
            const isaMap = srcMap.parentMap();
            this.context.setLocal("super", isaMap);
          }
        }
      }
    }    
  }

  private suspendUntilPromiseResolved(promise: Promise<any>) {
    // Mark VM for suspension
    this.suspendExecution();
    
    // Deal with promise resolved value
    promise.then((retVal: any) => {   
      // Push return value to stack
      this.opStack.push(retVal);
      // Advance IP
      this.ip += 1;
      // Resume execution
      this.resumeExecution();
    });
  }

}