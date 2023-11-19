/// <reference path="./frame.ts"/>
/// <reference path="./code.ts"/>
/// <reference path="./values.ts"/>

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
  // Core-types
  listCoreType: HashMap;
  mapCoreType: HashMap;
  stringCoreType: HashMap;
  numberCoreType: HashMap;
  // Core-type access functions
  listCoreTypeMapFn: BoundFunction;
  stringCoreTypeMapFn: BoundFunction;
  numberCoreTypeMapFn: BoundFunction;
  mapCoreTypeMapFn: BoundFunction;
  // Stack of frames (waiting to be returned to; not the current one).
  savedFrames: Stack<Frame>;
  // Counter used to return control back to host.
  cycleCount: number;
  // Callback when processing done
  onFinished: Function;
  // Random number generator
  rndGenerator: Function;

  constructor(programCode: Code, public readonly stdoutCallback: TxtCallback, public readonly stderrCallback: TxtCallback) {
    this.code = programCode;
    this.ip = 0;
    this.globalContext = new Context(this);
    this.listCoreType = new HashMap();
    this.mapCoreType = new HashMap();
    this.stringCoreType = new HashMap();
    this.numberCoreType = new HashMap();
    this.context = this.globalContext;
    this.savedFrames = new Stack<Frame>();
    this.opStack = new Stack();
    this.cycleCount = 0;
    this.onFinished = function() {};
    // Add core-type map-accessing functions
    const vmThis = this;
    this.listCoreTypeMapFn = this.makeNativeBoundFunction([], [], function() {
      return vmThis.listCoreType;
    });
    this.stringCoreTypeMapFn = this.makeNativeBoundFunction([], [], function() {
      return vmThis.stringCoreType;
    });
    this.numberCoreTypeMapFn = this.makeNativeBoundFunction([], [], function() {
      return vmThis.numberCoreType;
    });
    this.mapCoreTypeMapFn = this.makeNativeBoundFunction([], [], function() {
      return vmThis.mapCoreType;
    });
    this.rndGenerator = newAleaRndNrGenerator();
  }

  run() {
    this.runUntilDone();
  }

  addGlobalIntrinsic(signature: string, impl: Function) {
    const [fnName, argNames, defaultValues] = parseSignature(signature);
    const boundFunc = this.makeNativeBoundFunction(argNames, defaultValues, impl);
    this.globalContext.setLocal(fnName, boundFunc);
  }

  addCoreTypeIntrinsic(target: HashMap, name: string, boundFunc: BoundFunction) {
    target.set(name, boundFunc);
  }

  makeNativeBoundFunction(argNames: string[], defaultValues: any[], impl: Function): BoundFunction {
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
    this.rndGenerator = newAleaRndNrGenerator(seed);
  }

  random() {
    return this.rndGenerator();
  }

  runUntilDone(maxCount: number = 73681) {
    if (!this.isFinished()) {
      try {
        this.executeCycles(maxCount);
      } catch(e: any) {
        if (e["message"]) {
          this.stderrCallback(e.message);
        }
        console.error(e);
        this.forceFinish(maxCount);
      }
      window.setTimeout(() => {
        this.runUntilDone()
      }, 0)
    } else {
      // Check that stack is balanced (empty)
      if (this.opStack.count() > 0) {
        console.info("Stack: ", this.opStack);
        throw new RuntimeError("Stack was not empty!")
      }
      // Invoke callback
      this.onFinished();
    }
  }

  executeCycles(maxCount: number) {
    this.cycleCount = 0;
    while(this.cycleCount < maxCount) {
      switch (this.code.opCodes[this.ip]) {
        case BC.CALL: {
          const funcName: string = this.code.arg1[this.ip] as string;
          const paramCount: number = this.code.arg2[this.ip] as number;

          const optValue: any | undefined = this.context.getOpt(funcName);
          if (optValue === undefined) {
            throw new RuntimeError(`Could not resolve "${funcName}" [line ${this.getCurrentSrcLineNr()}]`);
          }
          const resolvedFunc: any = optValue;
          this.performCall(resolvedFunc, paramCount);
          break;
        }
        case BC.DOT_CALL: {
          const paramCount: number = this.code.arg1[this.ip] as number;
          const methodName: string = this.opStack.pop();
          const callTarget = this.opStack.pop();

          let resolvedMethod: any;
          if (callTarget instanceof HashMap) {
            resolvedMethod = this.mapAccess(callTarget, methodName);
          } else {
            // Lookup in base type
            const baseTypeMap = this.selectCoreTypeMap(callTarget);
            resolvedMethod = this.coreTypeMapAccess(baseTypeMap, methodName);
          }
          this.performCall(resolvedMethod, paramCount, callTarget);
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
          // pop index
          const index = this.opStack.pop();
          // pop value
          const valueToAssign = this.opStack.pop();

          const isString = typeof assignTarget === "string";
          const isList = assignTarget instanceof Array;
          const isMap = assignTarget instanceof HashMap;

          if (isList) {
            // Check and compute index
            checkInt(index, "Index must be an integer");
            const effectiveIndex = computeAccessIndex(this, assignTarget, index);
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

          if (!(assignTarget instanceof HashMap)) {
            throw new RuntimeError(`Assignment target must be a Map [line ${this.getCurrentSrcLineNr()}]`);
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
            throw new RuntimeError(`Undefined Local Identifier: '${varName}' is unknown in this context [line ${this.getCurrentSrcLineNr()}]`);
          }
          this.ip += 1;
          break;
        }
        case BC.MATH_ASSIGN_INDEXED: {
          const opTokenType: TokenType = this.code.arg1[this.ip] as TokenType;
          // pop target
          const assignTarget = this.opStack.pop();
          // pop index
          const index = this.opStack.pop();
          // pop value
          const operand = this.opStack.pop();

          const isString = typeof assignTarget === "string";
          const isList = assignTarget instanceof Array;
          const isMap = assignTarget instanceof HashMap;

          if (isList) {
            // Check and compute index
            checkInt(index, "Index must be an integer");
            const effectiveIndex = computeAccessIndex(this, assignTarget, index);
            const currentValue = assignTarget[effectiveIndex];
            const finalValue = computeMathAssignValue(currentValue, opTokenType, operand);
            assignTarget[effectiveIndex] = finalValue;
          } else if(isMap) {
            const currentValue = this.mapAccess(assignTarget, index);
            const finalValue = computeMathAssignValue(currentValue, opTokenType, operand);
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
          const assignTarget = this.opStack.pop();
          const operand = this.opStack.pop();

          if (!(assignTarget instanceof HashMap)) {
            throw new RuntimeError(`Assignment target must be a Map [line ${this.getCurrentSrcLineNr()}]`);
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
            this.callOrPushValue(optValue, isFuncRef, null);
          } else {
            // Could not resolve, maybe it's a core-type function
            const value = this.resolveSpecial(identifier);
            if (value === undefined) {
              throw new RuntimeError(`Undefined Identifier: '${identifier}' is unknown in this context [line ${this.getCurrentSrcLineNr()}]`);
            }
            this.callOrPushValue(value, isFuncRef, null);
          }
          break;
        }
        case BC.INDEXED_ACCESS: {
          const isFuncRef: boolean = this.code.arg1[this.ip];
          const accessTarget = this.opStack.pop();
          const index = this.opStack.pop();

          const isString = typeof accessTarget === "string";
          const isList = accessTarget instanceof Array;
          const isMap = accessTarget instanceof HashMap;

          let value: any;

          if (isList || isString) {
            if (typeof index === "number") {
              checkInt(index, `Index must be an integer [line ${this.getCurrentSrcLineNr()}]`);
              const effectiveIndex = computeAccessIndex(this, accessTarget, index);
              value = accessTarget[effectiveIndex];
            } else if (isList) {
              value = this.mapAccess(this.listCoreType, index);
            } else if (isString) {
              value = this.mapAccess(this.stringCoreType, index);
            } else {
              throw new Error("Uncovered case");
            }
          } else if(isMap) {
            value = this.mapAccess(accessTarget, index);
          } else if (typeof index === "number") {
            throw new RuntimeError(`Null Reference Exception: can't index into null [line ${this.getCurrentSrcLineNr()}]`);
          } else {
            throw new RuntimeError(`Type Error (while attempting to look up ${index}) [line ${this.getCurrentSrcLineNr()}]`);
          }

          this.callOrPushValue(value, isFuncRef, accessTarget);
          break;
        }
        case BC.DOT_ACCESS : {
          const propertyName: string = this.code.arg1[this.ip];
          const isFuncRef: boolean = this.code.arg2[this.ip];
          const accessTarget = this.opStack.pop();

          let value: any;
          if (accessTarget instanceof HashMap) {
            value = this.mapAccess(accessTarget, propertyName);
          } else if (accessTarget === null) {
            throw new RuntimeError(`Type Error (while attempting to look up ${propertyName}) [line ${this.getCurrentSrcLineNr()}]`);
          } else {
            // Lookup in base type - redefine access-target
            const baseTypeMap = this.selectCoreTypeMap(accessTarget);
            value = this.coreTypeMapAccess(baseTypeMap, propertyName);
          }
          this.callOrPushValue(value, isFuncRef, accessTarget);
          break;         
        }
        case BC.SLICE_SEQUENCE: {
          // Pop parameters
          const sliceTarget = this.opStack.pop();
          const endIdx = this.opStack.pop();
          const startIdx = this.opStack.pop();
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
            const mapValue = elements[i];
            const mapKey = elements[i+1];
            newMap.set(mapKey, mapValue);
          }
          this.opStack.push(newMap);
          this.ip += 1;
          break;
        }
        case BC.NEW_MAP: {
          const parentMap = this.opStack.pop();
          if (!(parentMap instanceof HashMap)) {
            throw new RuntimeError(`Operator "new" can only be used with Maps [line ${this.getCurrentSrcLineNr()}]`);
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
            throw new RuntimeError(`Value must be a number [line ${this.getCurrentSrcLineNr()}]`);
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
        case BC.EXIT: {
          this.forceFinish(maxCount);
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
          throw new RuntimeError("Bytecode not supported: " + this.code.opCodes[this.ip]);
        }
      } // switch
      this.cycleCount++;
    } // while
  } // executeCycles

  isFinished(): boolean {
    return this.ip >= this.code.opCodes.length;
  }

  forceFinish(maxCount: number) {
    this.opStack.clear();
    this.cycleCount = maxCount;
    this.ip = this.code.opCodes.length;
  }

  willExecuteCall(): boolean {
    const op = this.code.opCodes[this.ip];
    // TODO: one could also perform a call when evaluating an identifier
    // that results in a function!
    const isCall = op == BC.CALL || op == BC.DOT_CALL;
    return isCall;
  }

  pushFrame() {
    const frame = new Frame(this.code, this.ip, this.context);
    this.savedFrames.push(frame);
    // Remove at some point?
    if (this.savedFrames.count() > 100) {
      throw new RuntimeError("Too much recursion");
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
      throw new RuntimeError(`No core-type map for value ${accessTarget}`);
    }
  }

  private coreTypeMapAccess(mapObj: HashMap, key: any): any {
    if (mapObj.has(key)) {
      return mapObj.get(key);
    } else {
      throw new RuntimeError(`Key Not Found: '${key}' not found in map [line ${this.getCurrentSrcLineNr()}]`);
    }
  }

  mapAccess(mapObj: HashMap, key: any): any {
    const value = this.mapAccessOpt(mapObj, key);
    if (value === undefined) {
      throw new RuntimeError(`Key Not Found: '${key}' not found in map [line ${this.getCurrentSrcLineNr()}]`);
    } else {
      return value;
    }
  }

  mapAccessOpt(mapObj: HashMap, key: any, depth: number = 0): any | undefined {
    if (depth > MAX_ISA_RECURSION_DEPTH) {
      throw new RuntimeError(`__isa depth exceeded (perhaps a reference loop?) [line ${this.getCurrentSrcLineNr()}]`);
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

  private resolveSpecial(identifier: string): BoundFunction|undefined {
    if (identifier === "string") {
      return this.stringCoreTypeMapFn
    } else if (identifier === "number") {
      return this.numberCoreTypeMapFn;
    } else if (identifier === "list") {
      return this.listCoreTypeMapFn;
    } else if (identifier === "map") {
      return this.mapCoreTypeMapFn;
    } else {
      return undefined;
    }
  }

  private callOrPushValue(value: any, isFuncRef: boolean, accessSrc: any | null) {
    // If it's a function and we are not dealing with a function
    // reference, the function should be called.
    // The resulting value will be put in the stack instead.
    if (value instanceof BoundFunction && !isFuncRef) {
      this.performCall(value, 0, accessSrc);
    } else {
      // Otherwise use the value as-is
      this.opStack.push(value)
      this.ip += 1;
    }
  }

  private performCall(maybeFunction: any, paramCount: number = 0, dotCallTarget: any | null = null) {
    if (!(maybeFunction instanceof BoundFunction)) {
      if (paramCount > 0) {
        throw new RuntimeError(`Too Many Arguments [line ${this.getCurrentSrcLineNr()}]`);
      } else {
        throw new RuntimeError(`Attempting to call a non-function [line ${this.getCurrentSrcLineNr()}]`);
      }
    }

    const boundFunc = maybeFunction as BoundFunction;
    const funcDef = boundFunc.funcDef;

    let funcArgCount = funcDef.argNames.length;

    // Subtract one argument for a native dot-call
    if (funcDef.isNative() && dotCallTarget !== null) {
      funcArgCount -= 1;
    }

    if (paramCount > funcArgCount) {
      throw new RuntimeError(`Too many parameters calling function [line ${this.getCurrentSrcLineNr()}].`)
    } else if (paramCount < funcArgCount) {
      // Push the missing default argument values
      const missingArgCount = funcArgCount - paramCount;
      const defaultValues = funcDef.getLastNEffectiveDefaultValues(missingArgCount);
      for (let value of defaultValues) {
        this.opStack.push(value);
      }
    }

    if (funcDef.isNative()) {
      const func = funcDef.getFunction();
      // Build parameter list
      const paramValues = [];
      // Pop param values from stack (even default ones)
      let argNames = funcDef.argNames;
      if (dotCallTarget !== null) {
        // Ommit the "self" argument
        argNames = argNames.slice(1);
      }
      for (let {} of argNames) {
        const paramValue = this.opStack.pop();
        paramValues.unshift(paramValue);
      }
      // Add dot-call target "manually", if any
      if (dotCallTarget) {
        // The "self" parameter
        paramValues.unshift(dotCallTarget);
      }
      // Call with parameters
      const retVal = func.apply(this, paramValues);
      // Push return value to stack
      this.opStack.push(retVal);
      // Advance IP
      this.ip += 1;
    } else {
      // Let it return to the next bytecode after the call
      this.ip += 1;
      this.pushFrame();

      this.code = funcDef.getCode();
      this.context = new Context(this, boundFunc.context);
      this.ip = 0;

      // Pop and set parameters as variables
      const parameterValues = this.opStack.popN(funcArgCount);
      let argNames = funcDef.argNames;
    
      if (dotCallTarget) {
        argNames = argNames.filter((n:string) => n !== "self");
      }

      for (let i = 0; i < argNames.length; i++) {
        const argName = argNames[i];
        const paramValue = parameterValues[i];
        this.context.setLocal(argName, paramValue);
      }
      // Add dot-call target if any
      if (dotCallTarget) {
        // The "self" value
        this.context.setLocal("self", dotCallTarget);
      }
    }    
  }

}