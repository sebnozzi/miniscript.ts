/// <reference path="./frame.ts"/>
/// <reference path="./code.ts"/>
/// <reference path="./values.ts"/>

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
  // Stack of frames (waiting to be returned to; not the current one).
  savedFrames: Stack<Frame>;
  // Counter used to return control back to host.
  cycleCount: number;
  // Callback when processing done
  onFinished: Function;

  constructor(programCode: Code) {
    this.code = programCode;
    this.ip = 0;
    this.globalContext = new Context();
    this.context = this.globalContext;
    this.savedFrames = new Stack<Frame>();
    this.opStack = new Stack();
    this.cycleCount = 0;
    this.onFinished = function() {};
  }

  run() {
    this.runUntilDone();
  }

  addNative(name: string, argCount: number, impl: Function) {
    const args = [];
    for (let argIdx = 0; argIdx < argCount; argIdx++) {
      args.push(new FuncDefArg(`arg_${argIdx + 1}`, undefined));
    }
    const funcDef = new FuncDef(args, impl);
    const boundFunc = new BoundFunction(funcDef, this.globalContext);
    this.globalContext.setLocal(name, boundFunc);
  }

  addNativeWithDefaults(name: string, argCount: number, defaultValues: any[], impl: Function) {
    const args = [];
    for (let argIdx = 0; argIdx < argCount; argIdx++) {
      const defaultValue = defaultValues[argIdx];
      const arg = new FuncDefArg(`arg_${argIdx + 1}`, defaultValue);
      args.push(arg);
    }
    const funcDef = new FuncDef(args, impl);
    const boundFunc = new BoundFunction(funcDef, this.globalContext);
    this.globalContext.setLocal(name, boundFunc);
  }

  runUntilDone(maxCount: number = 73681) {
    if (!this.isFinished()) {
      this.executeCycles(maxCount)
      window.setTimeout(() => {
        this.runUntilDone()
      }, 0)
    } else {
      // Check that stack is balanced (empty)
      if (this.opStack.count() > 0) {
        console.info("Stack: ", this.opStack);
        throw new Error("Stack was not empty!")
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

          const resolvedFunc: any = this.context.get(funcName);

          this.performCall(funcName, paramCount, resolvedFunc, null);
          break;
        }
        case BC.DOT_CALL: {
          const paramCount: number = this.code.arg1[this.ip] as number;
          const methodName: string = this.opStack.pop();
          const callTarget = this.opStack.pop();

          if(!(callTarget instanceof Map)) {
            throw new Error("Can call methods only on Maps");
          }

          if(!(callTarget.has(methodName))) {
            throw new Error(`Map has no property "${methodName}"`);
          }

          const resolvedMethod: any = callTarget.get(methodName);

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
            throw new Error("Cannot assign to String (immutable)");
          } else {
            throw new Error("Cannot set to element of this type");
          }

          this.ip += 1;
          break;
        }
        case BC.DOT_ASSIGN : {
          const propertyName: string = this.code.arg1[this.ip];
          const assignTarget = this.opStack.pop();
          const valueToAssign = this.opStack.pop();

          if (!(assignTarget instanceof Map)) {
            throw new Error("Assignment target must be a Map");
          }

          assignTarget.set(propertyName, valueToAssign);
          this.ip += 1;
          break;         
        }
        case BC.EVAL_ID: {
          const identifier = this.code.arg1[this.ip];
          const value = this.context.get(identifier);
          this.callOrPushValue(value);
          break;
        }
        case BC.INDEXED_ACCESS: {
          const accessTarget = this.opStack.pop();
          const index = this.opStack.pop();

          const isString = typeof accessTarget === "string";
          const isList = accessTarget instanceof Array;
          const isMap = accessTarget instanceof Map;

          let value: any;

          if (isList || isString) {
            checkInt(index, "Index must be an integer");
            const effectiveIndex = computeEffectiveIndex(accessTarget, index);
            value = accessTarget[effectiveIndex];
          } else if(isMap) {
            value = mapAccess(accessTarget, index);
          } else {
            throw new Error("Cannot perform indexed access on this type");
          }

          this.callOrPushValue(value);
          break;
        }
        case BC.DOT_ACCESS : {
          const propertyName: string = this.code.arg1[this.ip];
          const accessTarget = this.opStack.pop();

          if (!(accessTarget instanceof Map)) {
            throw new Error("Properties can be accessed only from Maps");
          }
          const value = mapAccess(accessTarget, propertyName);
          this.callOrPushValue(value);
          break;         
        }
        case BC.SLICE_SEQUENCE: {
          // Pop parameters
          const sliceTarget = this.opStack.pop();
          let endIdx = this.opStack.pop();
          let startIdx = this.opStack.pop();
          // Check list-target
          if (!(sliceTarget instanceof Array || typeof sliceTarget === "string")) {
            throw new Error("Slice target must be List or String");
          }
          // Check / compute indexes
          if (startIdx) {
            checkInt(startIdx, "Slice-start should be an integer value");
            startIdx = computeEffectiveIndex(sliceTarget, startIdx);
          } else {
            // Take slice from the beginning
            startIdx = 0;
          }
          if (endIdx) {
            checkInt(endIdx, "Slice-end should be an integer value");
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
            throw new Error("Operator `new` can only be used with Maps");
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
            throw new Error("Value must be a number");
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
          this.cycleCount = maxCount;
          this.ip = this.code.opCodes.length;
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
          throw new Error("Bytecode not supported: " + this.code.opCodes[this.ip]);
        }
      } // switch
      this.cycleCount++;
    } // while
  } // executeCycles

  isFinished(): boolean {
    return this.ip >= this.code.opCodes.length;
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
      throw new Error("Too much recursion");
    }
  }

  popFrame() {
    const frame = this.savedFrames.pop();
    this.ip = frame.ip;
    this.context = frame.context;
    this.code = frame.code;
  }

  private callOrPushValue(value: any) {
    if (value instanceof BoundFunction) {
      // If it's a function, it should be called.
      // The resulting value will be put in the stack instead.
      this.immediatelyCallFunction(value);
    } else {
      // If it's not a function, use the value as-is
      this.opStack.push(value)
      this.ip += 1;
    }
  }

  private performCall(funcName: string, paramCount: number, maybeFunction: any, dotCallTarget: any | null) {
    if (!(maybeFunction instanceof BoundFunction)) {
      throw new Error(`Identifier ${funcName} should be a function`);
    }

    const boundFunc = maybeFunction as BoundFunction;
    const funcDef = boundFunc.funcDef;

    const funcArgCount = funcDef.argNames.length;

    if (paramCount > funcArgCount) {
      throw new Error(`Too many parameters in call to ${funcName}. Expected at most ${funcArgCount}, found ${paramCount}.`)
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
      for (let argName of funcDef.reversedArgNames) {
        const paramValue = this.opStack.pop();
        this.context.setLocal(argName, paramValue);
      }
      // Add dot-call target if any
      if (dotCallTarget) {
        // The "self" value
        this.context.setLocal("self", dotCallTarget);
      }
    }    
  }

  private immediatelyCallFunction(value: BoundFunction) {
    const funcDef: FuncDef = value.funcDef;

    // Decide how to call function
    if (funcDef.isNative()) {
      let params = [];
      // Use default values, if any
      if (funcDef.argNames.length > 0) {
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
      this.context = new Context(value.context);
      // Populate default values, if any
      for (let idx = 0; idx < funcDef.argNames.length; idx++) {
        this.context.setLocal(funcDef.argNames[idx], funcDef.effectiveDefaultValues[idx]);
      }
      // Set initial ip
      this.ip = 0;  
    }
  }

}