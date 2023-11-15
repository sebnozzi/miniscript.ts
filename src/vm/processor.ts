/// <reference path="./frame.ts"/>
/// <reference path="./code.ts"/>
/// <reference path="./values.ts"/>

type TxtCallback = (txt: string) => any;

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
  listCoreType: Map<any, any>;
  mapCoreType: Map<any, any>;
  stringCoreType: Map<any, any>;
  numberCoreType: Map<any, any>;
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

  constructor(programCode: Code, public readonly stdoutCallback: TxtCallback, public readonly stderrCallback: TxtCallback) {
    this.code = programCode;
    this.ip = 0;
    this.globalContext = new Context();
    this.listCoreType = new Map<any, any>();
    this.mapCoreType = new Map<any, any>();
    this.stringCoreType = new Map<any, any>();
    this.numberCoreType = new Map<any, any>();
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
  }

  run() {
    this.runUntilDone();
  }

  addGlobalImplicit(signature: string, impl: Function) {
    const [fnName, argNames, defaultValues] = parseSignature(signature);
    const boundFunc = this.makeNativeBoundFunction(argNames, defaultValues, impl);
    this.globalContext.setLocal(fnName, boundFunc);
  }

  addCoreTypeImplicit(target: Map<string, any>, name: string, boundFunc: BoundFunction) {
    boundFunc.makeSelfFunction();
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
          this.performCall(funcName, paramCount, resolvedFunc, null);
          break;
        }
        case BC.DOT_CALL: {
          const paramCount: number = this.code.arg1[this.ip] as number;
          const methodName: string = this.opStack.pop();
          const callTarget = this.opStack.pop();

          let resolvedMethod: any;
          if (callTarget instanceof Map) {
            resolvedMethod = this.mapAccess(callTarget, methodName);
          } else {
            // Lookup in base type
            const baseTypeMap = this.selectCoreTypeMap(callTarget);
            resolvedMethod = this.coreTypeMapAccess(baseTypeMap, methodName);
          }

          this.performCall(methodName, paramCount, resolvedMethod, callTarget);
          break;
        }
        case BC.RETURN: {
          this.popFrame();
          break;
        }
        case BC.ASSIGN_LOCAL: {
          const valueToAssign = this.opStack.pop();
          const varName: string = this.code.arg1[this.ip] as string;
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
          const isMap = assignTarget instanceof Map;

          if (isList) {
            // Check and compute index
            checkInt(index, "Index must be an integer");
            const effectiveIndex = computeEffectiveIndex(assignTarget, index);
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

          if (!(assignTarget instanceof Map)) {
            throw new RuntimeError(`Assignment target must be a Map [line ${this.getCurrentSrcLineNr()}]`);
          }

          assignTarget.set(propertyName, valueToAssign);
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
          const isMap = accessTarget instanceof Map;

          let value: any;

          if (isList || isString) {
            if (typeof index === "number") {
              checkInt(index, `Index must be an integer [line ${this.getCurrentSrcLineNr()}]`);
              const effectiveIndex = computeEffectiveIndex(accessTarget, index);
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
          } else {
            throw new RuntimeError(`Cannot perform indexed access on this type [line ${this.getCurrentSrcLineNr()}]`);
          }

          this.callOrPushValue(value, isFuncRef, accessTarget);
          break;
        }
        case BC.DOT_ACCESS : {
          const propertyName: string = this.code.arg1[this.ip];
          const isFuncRef: boolean = this.code.arg2[this.ip];
          const accessTarget = this.opStack.pop();

          let value: any;
          if (accessTarget instanceof Map) {
            value = this.mapAccess(accessTarget, propertyName);
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
          let endIdx = this.opStack.pop();
          let startIdx = this.opStack.pop();
          // Check list-target
          if (!(sliceTarget instanceof Array || typeof sliceTarget === "string")) {
            throw new RuntimeError(`Slice target must be List or String [line ${this.getCurrentSrcLineNr()}]`);
          }
          // Check / compute indexes
          if (startIdx) {
            checkInt(startIdx, `Slice-start should be an integer value [line ${this.getCurrentSrcLineNr()}]`);
            startIdx = computeEffectiveIndex(sliceTarget, startIdx);
          } else {
            // Take slice from the beginning
            startIdx = 0;
          }
          if (endIdx) {
            checkInt(endIdx, `Slice-end should be an integer value [line ${this.getCurrentSrcLineNr()}]`);
            endIdx = computeEffectiveIndex(sliceTarget, endIdx);
          } else {
            // Take slice to the end
            endIdx = sliceTarget.length;
          }
          // Compute slice
          const newCollection = sliceTarget.slice(startIdx, endIdx);
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
          const newMap = new Map<any, any>();
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
          if (!(parentMap instanceof Map)) {
            throw new RuntimeError(`Operator "new" can only be used with Maps [line ${this.getCurrentSrcLineNr()}]`);
          }
          const newMap = new Map<any, any>();
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
    const frame = new Frame(this.code);
    frame.context = this.context;
    frame.ip = this.ip;
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

  private selectCoreTypeMap(accessTarget: any): Map<any,any> {
    if (accessTarget instanceof Array) {
      return this.listCoreType;
    } else if (typeof accessTarget === "string") {
      return this.stringCoreType;
    } else if (accessTarget instanceof Map) {
      return this.mapCoreType;
    } else if (typeof accessTarget === "number") {
      return this.numberCoreType;
    } else {
      throw new RuntimeError(`No core-type map for value ${accessTarget}`);
    }
  }

  private coreTypeMapAccess(mapObj: Map<any, any>, key: any): any {
    if (mapObj.has(key)) {
      return mapObj.get(key);
    } else {
      throw new RuntimeError(`Key Not Found: '${key}' not found in map [line ${this.getCurrentSrcLineNr()}]`);
    }
  }

  private mapAccess(mapObj: Map<any, any>, key: any): any {
    if (mapObj.has(key)) {
      return mapObj.get(key);
    } else if (mapObj.has("__isa")) {
      const parentMap = mapObj.get("__isa");
      return this.mapAccess(parentMap, key); 
    } else if (mapObj === this.mapCoreType) {
      throw new RuntimeError(`Key Not Found: '${key}' not found in map [line ${this.getCurrentSrcLineNr()}]`);
    } else {
      return this.mapAccess(this.mapCoreType, key); 
    }
  }

  private resolveSpecial(identifier: string): any {
    if (identifier === "string") {
      return this.stringCoreTypeMapFn
    } else if (identifier === "number") {
      return this.numberCoreTypeMapFn;
    } else if (identifier === "list") {
      return this.listCoreTypeMapFn;
    } else if (identifier === "map") {
      return this.mapCoreTypeMapFn;
    } else {
      throw new RuntimeError(`Could not resolve "${identifier}" [line ${this.getCurrentSrcLineNr()}]`);
    }
  }

  private callOrPushValue(value: any, isFuncRef: boolean, accessSrc: any | null) {
    // If it's a function and we are not dealing with a function
    // reference, the function should be called.
    // The resulting value will be put in the stack instead.
    if (value instanceof BoundFunction && !isFuncRef) {
      this.immediatelyCallFunction(value, accessSrc);
    } else {
      // Otherwise use the value as-is
      this.opStack.push(value)
      this.ip += 1;
    }
  }

  private performCall(funcName: string, paramCount: number, maybeFunction: any, dotCallTarget: any | null) {
    if (!(maybeFunction instanceof BoundFunction)) {
      throw new RuntimeError(`Identifier ${funcName} should be a function [line ${this.getCurrentSrcLineNr()}]`);
    }

    const boundFunc = maybeFunction as BoundFunction;
    const funcDef = boundFunc.funcDef;

    const funcArgCount = funcDef.argNames.length;

    if (paramCount > funcArgCount) {
      throw new RuntimeError(`Too many parameters in call to ${funcName} [line ${this.getCurrentSrcLineNr()}].`)
    } else if (paramCount < funcDef.argNames.length) {
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
      for (let {} of funcDef.argNames) {
        const paramValue = this.opStack.pop();
        paramValues.unshift(paramValue);
      }
      // Add dot-call target if any
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
      this.context = new Context(boundFunc.context);
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

  private immediatelyCallFunction(boundFunc: BoundFunction, accessSrc: any | null) {
    const funcDef: FuncDef = boundFunc.funcDef;

    // Decide how to call function
    if (funcDef.isNative()) {
      let params = [];
      if (boundFunc.isSelfFunction()) {
        params.push(accessSrc);
        // Use default arg-values, if any
        let moreParams = funcDef.effectiveDefaultValues;
        // Skip first param
        moreParams = moreParams.slice(1);
        for(let p in moreParams) {
          params.push(p);
        }
      } else {
        // Use default arg-values, if any
        params = funcDef.effectiveDefaultValues;
      }

      const func = funcDef.getFunction();
      const retVal = func.apply(this, params);
      this.opStack.push(retVal);
      this.ip += 1;
    } else {
      // Let it return to the next bytecode after the call
      this.ip += 1;
      this.pushFrame();
      // Set the new code to run
      this.code = funcDef.getCode();
      this.context = new Context(boundFunc.context);
      // Populate default values, if any
      for (let idx = 0; idx < funcDef.argNames.length; idx++) {
        this.context.setLocal(funcDef.argNames[idx], funcDef.effectiveDefaultValues[idx]);
      }
      // If it has an access-source, set "self" to that value
      if (accessSrc) {
        this.context.setLocal("self", accessSrc);
      }
      // Set initial ip
      this.ip = 0;  
    }
  }

}