/// <reference path="./frame.ts"/>
/// <reference path="./code.ts"/>
/// <reference path="./runtime.ts"/>

type TxtCallback = (txt: string) => any;

const MAX_ISA_RECURSION_DEPTH = 16;

class Processor {

  // The instruction pointer. Points to the position in code.
  ip: number;
  // The operation stack. Used for calculations and passing values.
  opStack: Stack<any>;
  // The code to execute.
  code: Code;
  // The current context.
  context: Context;
  // The global context.
  globalContext: Context;
  // Intrinsics stored here
  intrinsicsMap: Map<string, BoundFunction>;
  // Core-types
  listCoreType: HashMap;
  mapCoreType: HashMap;
  stringCoreType: HashMap;
  numberCoreType: HashMap;
  funcRefCoreType: HashMap;
  // Stack of frames (waiting to be returned to; not the current one).
  savedFrames: Stack<Frame>;
  // Counter used to return control back to host.
  cycleCount: number;
  // Max count of cycles per "burst"
  maxCount: number = 73681;
  // Callback when processing done
  onFinished: Function;
  // Callback when suspended until a Promise delivers a result
  onSuspendedByPromise: Function;
  // Callback when the result Promise is resolved
  onPromiseResolved: Function;
  // Random number generator
  rndGenerator: Function;
  // Timestamp when a script starts executing. Used in `time`.
  executionStartTime: number;
  // Flag to know when execution is suspended (e.g. waiting on a promise)
  suspended: boolean = false;
  // Maximum depth of call stack
  maxCallStackDepth: number = 2000;

  constructor(programCode: Code, public readonly stdoutCallback: TxtCallback, public readonly stderrCallback: TxtCallback) {
    this.code = programCode;
    this.ip = 0;
    this.globalContext = new Context(this);
    this.intrinsicsMap = new Map();
    this.listCoreType = new HashMap();
    this.mapCoreType = new HashMap();
    this.stringCoreType = new HashMap();
    this.numberCoreType = new HashMap();
    this.funcRefCoreType = new HashMap();
    this.context = this.globalContext;
    this.savedFrames = new Stack<Frame>();
    this.opStack = new Stack();
    this.cycleCount = 0;
    this.onFinished = function() {};
    this.onSuspendedByPromise = function() {};
    this.onPromiseResolved = function() {
      // By default, continue running after a Promise is 
      // resolved. Alternate runners would want to change
      // this. For example a debugger.
      this.runUntilDone();
    };

    this.rndGenerator = newRandomGenerator();
    this.executionStartTime = 0;
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

  addMapIntrinsic(target: HashMap, name: string, boundFunc: BoundFunction) {
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

  initRandomGenerator(seed: number | string) {
    this.rndGenerator = newRandomGenerator(seed);
  }

  random() {
    return this.rndGenerator();
  }

  runtimeError(msg: string): RuntimeError {
    return new RuntimeError(`${msg} [line ${this.getCurrentSrcLineNr()}]`);
  }

  runUntilDone() {
    if (this.isRunning()) {
      try {
        this.executeCycles();
      } catch(e: any) {
        if (e["message"]) {
          this.stderrCallback(e.message);
        }
        console.error(e);
        this.stopRunning();
        return;
      }
      // If not waiting on a Promise or finished
      // running, schedule the next execution burst.
      if (this.isRunning()) {
        setTimeout(() => {
          this.runUntilDone()
        }, 0);
      }
    }

    if (this.isFinished()) {
      // Call after program ends normally
      this.cleanupAfterRunning();
    }
  }

  executeCycles(maxCount: number | null = null) {
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
            throw this.runtimeError(`Could not resolve "${funcName}"`);
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

          let resolvedMethod: any;
          if (callTarget instanceof HashMap) {
            resolvedMethod = this.mapAccess(callTarget, methodName);
          } else {
            // Lookup in base type
            const baseTypeMap = this.selectCoreTypeMap(callTarget);
            resolvedMethod = this.coreTypeMapAccess(baseTypeMap, methodName);
          }
          this.performCall(resolvedMethod, params, callTarget);
          break;
        }
        case BC.RETURN: {
          this.popFrame();
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
          const isMap = assignTarget instanceof HashMap;

          if (isList) {
            const effectiveIndex = computeAccessIndex(this, assignTarget, index);
            assignTarget[effectiveIndex] = valueToAssign;
          } else if(isMap) {
            assignTarget.set(index, valueToAssign);
          } else if(isString) {
            throw this.runtimeError("Cannot assign to String (immutable)");
          } else {
            throw this.runtimeError("Cannot set to element of this type");
          }

          this.ip += 1;
          break;
        }
        case BC.DOT_ASSIGN : {
          const propertyName: string = this.code.arg1[this.ip];
          const assignTarget = this.opStack.pop();
          const valueToAssign = this.opStack.pop();

          if (!(assignTarget instanceof HashMap)) {
            throw this.runtimeError(`Assignment target must be a Map`);
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
            const finalValue = computeMathAssignValue(existingValue, opTokenType, operand);
            this.context.setLocal(varName, finalValue);
          } else {
            throw this.runtimeError(`Undefined Local Identifier: '${varName}' is unknown in this context`);
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
          const isMap = assignTarget instanceof HashMap;

          if (isList) {
            const effectiveIndex = computeAccessIndex(this, assignTarget, index);
            const currentValue = assignTarget[effectiveIndex];
            const finalValue = computeMathAssignValue(currentValue, opTokenType, operand);
            assignTarget[effectiveIndex] = finalValue;
          } else if(isMap) {
            const currentValue = this.mapAccess(assignTarget, index);
            const finalValue = computeMathAssignValue(currentValue, opTokenType, operand);
            assignTarget.set(index, finalValue);
          } else if(isString) {
            throw this.runtimeError("Cannot assign to String (immutable)");
          } else {
            throw this.runtimeError("Cannot set to element of this type");
          }

          this.ip += 1;
          break;
        }
        case BC.MATH_DOT_ASSIGN : {
          const propertyName: string = this.code.arg1[this.ip];
          const opTokenType: TokenType = this.code.arg2[this.ip] as TokenType;
          const operand = this.opStack.pop();
          const assignTarget = this.opStack.pop();

          if (!(assignTarget instanceof HashMap)) {
            throw this.runtimeError(`Assignment target must be a Map`);
          }

          const currentValue = this.mapAccess(assignTarget, propertyName);
          const finalValue = computeMathAssignValue(currentValue, opTokenType, operand);
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
            throw this.runtimeError(`Undefined Identifier: '${identifier}' is unknown in this context`);
          }
          break;
        }
        case BC.INDEXED_ACCESS: {
          const isFuncRef: boolean = this.code.arg1[this.ip];
          let index = this.opStack.pop();
          const accessTarget = this.opStack.pop();

          const isString = typeof accessTarget === "string";
          const isList = accessTarget instanceof Array;
          const isMap = accessTarget instanceof HashMap;

          let value: any;
          let srcMap: HashMap | null = null;

          if (isList || isString) {
            if (typeof index === "number") {
              const effectiveIndex = computeAccessIndex(this, accessTarget, index);
              value = accessTarget[effectiveIndex];
            } else if (isList) {
              [value, srcMap] = this.mapAccessWithSource(this.listCoreType, index);
            } else if (isString) {
              [value, srcMap] = this.mapAccessWithSource(this.stringCoreType, index);
            } else {
              throw new Error("Uncovered case");
            }
          } else if(isMap) {
            [value, srcMap] = this.mapAccessWithSource(accessTarget, index);
          } else if (typeof index === "number") {
            throw this.runtimeError(`Null Reference Exception: can't index into null`);
          } else {
            throw this.runtimeError(`Type Error (while attempting to look up ${index})`);
          }

          this.callOrPushValue(value, isFuncRef, accessTarget, srcMap);
          break;
        }
        case BC.DOT_ACCESS : {
          const propertyName: string = this.code.arg1[this.ip];
          const isFuncRef: boolean = this.code.arg2[this.ip];
          const accessTarget = this.opStack.pop();

          let value: any;
          let srcMap: HashMap;
          if (accessTarget instanceof HashMap) {
            [value, srcMap] = this.mapAccessWithSource(accessTarget, propertyName);
          } else if (accessTarget === null) {
            throw this.runtimeError(`Type Error (while attempting to look up ${propertyName})`);
          } else {
            // Lookup in base type - redefine access-target
            srcMap = this.selectCoreTypeMap(accessTarget);
            value = this.coreTypeMapAccess(srcMap, propertyName);
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
            throw this.runtimeError(`Undefined Identifier: 'super' is unknown in this context`);
          }
          if (selfMap === undefined) {
            throw this.runtimeError(`Undefined Identifier: 'self' is unknown in this context`);
          }

          let value: any;
          let srcMap: HashMap | null = null;
          if (superMap instanceof HashMap) {
            // Use the "superMap" only to lookup the value
            // But later call it with the "selfMap"
            [value, srcMap] = this.mapAccessWithSource(superMap, propertyName);
            if (value === undefined) {
              throw this.runtimeError(`Type Error (while attempting to look up ${propertyName})`);
            }
          } else if (superMap === null) {
            throw this.runtimeError(`Type Error (while attempting to look up ${propertyName})`);
          }

          // Note that the source-map and the super-map might not be
          // the same. Pass the source-map to compute a new "super".
          this.callOrPushValue(value, isFuncRef, selfMap, srcMap);
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
          const newMap = new HashMap();
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
          if (!(parentMap instanceof HashMap)) {
            throw this.runtimeError(`Operator "new" can only be used with Maps`);
          }
          const newMap = new HashMap();
          newMap.set("__isa", parentMap);
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
          const result = add(valueInStack_1, valueInStack_2)
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
            throw this.runtimeError(`Value must be a number`);
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
          this.opStack.pop();
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
          const forLoop = new ForLoop(startAddr, endAddr, localVarName, values);
          this.context.registerForLoop(forLoopNr, forLoop);
          // Advance IP
          this.ip += 1;
          break;
        }
        case BC.ITERATE_FOR_LOOP: {
          const forLoopNr = this.code.arg1[this.ip];
          const forLoop = this.context.getForLoop(forLoopNr);
          if (forLoop.isOver()) {
            this.ip = forLoop.endAddr;
            this.context.deleteForLoop(forLoopNr);
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
          const forLoop = this.context.getForLoop(forLoopNr);
          this.context.deleteForLoop(forLoopNr);
          this.ip = forLoop.endAddr;
          break;
        }
        case BC.CONTINUE_FOR_LOOP: {
          const forLoopNr = this.code.arg1[this.ip];
          const forLoop = this.context.getForLoop(forLoopNr);
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
          throw this.runtimeError("Bytecode not supported: " + this.code.opCodes[this.ip]);
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

  forceFinish() {
    this.onPromiseResolved = () => {};
    this.opStack.clear();
    this.cycleCount = this.maxCount;
    this.ip = this.code.opCodes.length;
  }

  cleanupAfterRunning() {
    // Check that stack is balanced (empty)
    if (this.opStack.count() > 0) {
      console.info("Stack: ", this.opStack);
      throw this.runtimeError("Stack was not empty!")
    }
    // Invoke callback
    this.onFinished();
  }

  suspendExecution() {
    this.cycleCount = this.maxCount;
    this.suspended = true;
    this.onSuspendedByPromise();
  }

  resumeExecution() {
    this.suspended = false;
    this.onPromiseResolved();
  }

  couldResultInCall(): boolean {
    const op = this.code.opCodes[this.ip];
    const result = hasCallPotential(op);
    return result;
  }

  pushFrame() {
    const frame = new Frame(this.code, this.ip, this.context);
    this.savedFrames.push(frame);
    // Remove at some point?
    if (this.savedFrames.count() > this.maxCallStackDepth) {
      throw this.runtimeError("Call stack too deep");
    }
  }

  popFrame() {
    const frame = this.savedFrames.pop();
    this.ip = frame.ip;
    this.context = frame.context;
    this.code = frame.code;
  }

  getCurrentSrcLineNr(): number | null {
    const optSrcMapEntry = this.code.srcMap.findEntry(this.ip);
    if (optSrcMapEntry !== null) {
      return optSrcMapEntry.srcLoc.start.row;
    } else {
      return null;
    }
  }

  private selectCoreTypeMap(accessTarget: any): HashMap {
    if (accessTarget instanceof Array) {
      return this.listCoreType;
    } else if (typeof accessTarget === "string") {
      return this.stringCoreType;
    } else if (accessTarget instanceof HashMap) {
      return this.mapCoreType;
    } else if (typeof accessTarget === "number") {
      return this.numberCoreType;
    } else {
      throw this.runtimeError(`No core-type map for value ${accessTarget}`);
    }
  }

  private coreTypeMapAccess(mapObj: HashMap, key: any): any {
    if (mapObj.has(key)) {
      return mapObj.get(key);
    } else {
      throw this.runtimeError(`Key Not Found: '${key}' not found in map`);
    }
  }

  mapAccess(mapObj: HashMap, key: any): any {
    const result = this.mapAccessOpt(mapObj, key);
    if (result === undefined) {
      throw this.runtimeError(`Key Not Found: '${key}' not found in map`);
    } else {
      return result;
    }
  }

  mapAccessWithSource(mapObj: HashMap, key: any, depth: number = 0): [any, HashMap] {
    if (depth > MAX_ISA_RECURSION_DEPTH) {
      throw this.runtimeError(`__isa depth exceeded (perhaps a reference loop?)`);
    }
    if (mapObj.has(key)) {
      return [mapObj.get(key), mapObj];
    } else if (mapObj.has("__isa")) {
      const parentMap = mapObj.get("__isa");
      return this.mapAccessWithSource(parentMap, key, depth + 1); 
    } else if (mapObj === this.mapCoreType) {
      throw this.runtimeError(`Key Not Found: '${key}' not found in map`);
    } else {
      return this.mapAccessWithSource(this.mapCoreType, key, depth + 1); 
    }
  }

  mapAccessOpt(mapObj: HashMap, key: any, depth: number = 0): any | undefined {
    if (depth > MAX_ISA_RECURSION_DEPTH) {
      throw this.runtimeError(`__isa depth exceeded (perhaps a reference loop?)`);
    }
    if (mapObj.has(key)) {
      return mapObj.get(key);
    } else if (mapObj.has("__isa")) {
      const parentMap = mapObj.get("__isa");
      return this.mapAccessOpt(parentMap, key, depth + 1); 
    } else if (mapObj === this.mapCoreType) {
      return undefined;
    } else {
      return this.mapAccessOpt(this.mapCoreType, key, depth + 1); 
    }
  }

  resolveIntrinsic(identifier: string): BoundFunction|undefined {
    const optIntrinsicFn = this.intrinsicsMap.get(identifier);
    return optIntrinsicFn;
  }

  private callOrPushValue(value: any, isFuncRef: boolean, accessSrc: any | undefined = undefined, srcMap: HashMap | null = null) {
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

  private performCall(maybeFunction: any, paramValues: any[], dotCallTarget: any | undefined = undefined, srcMap: HashMap | null = null) {
    
    const paramCount = paramValues.length;

    if (!(maybeFunction instanceof BoundFunction)) {
      if (paramCount > 0) {
        throw this.runtimeError(`Too Many Arguments`);
      } else {
        throw this.runtimeError(`Attempting to call a non-function`);
      }
    }

    const boundFunc = maybeFunction as BoundFunction;
    const funcDef = boundFunc.funcDef;

    let funcArgCount = funcDef.argNames.length;

    // Subtract one argument for a native dot-call
    if (funcDef.isNative() && dotCallTarget !== undefined) {
      funcArgCount -= 1;
    }

    // If parameters missing, complete with default values
    if (paramCount > funcArgCount) {
      throw this.runtimeError(`Too many parameters calling function.`)
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
      // Add dot-call target "manually", if any
      if (dotCallTarget !== undefined) {
        // The "self" parameter
        paramValues.unshift(dotCallTarget);
      }
      // Call with parameters
      const retVal = func.apply(this, paramValues);

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
      // Function is a miniScript-code function.
      // (not an intrinsic)

      // Let it return to the next bytecode after the call
      this.ip += 1;
      this.pushFrame();

      // Setup next frame
      this.code = funcDef.getCode();
      this.context = new Context(this, boundFunc.context);
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
          const isaMap = srcMap.get("__isa");
          if (isaMap !== undefined) {
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