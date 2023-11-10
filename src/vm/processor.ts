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
      this.onFinished();
    }
  }

  executeCycles(maxCount: number) {
    this.cycleCount = 0;
    while(this.cycleCount < maxCount) {
      switch (this.code.opCodes[this.ip]) {
        case BC.CALL: {
          let funcName: string = this.code.arg1[this.ip] as string;
          let argCount: number = this.code.arg2[this.ip] as number;

          const resolved: any = this.context.get(funcName);

          if (!(resolved instanceof BoundFunction)) {
            throw new Error(`Identifier ${funcName} should be a function`);
          } else {
            const boundFunc = resolved as BoundFunction;
            const funcDef = boundFunc.funcDef;

            const funcArgCount = funcDef.argNames.length;
            const minArgCount = funcDef.requiredArgCount;

            if (argCount > funcArgCount) {
              throw new Error(`Too many parameters in call to ${funcName}. Expected at most ${funcArgCount}, found ${argCount}.`)
            } else if (argCount < funcDef.argNames.length) {
              if (argCount < minArgCount) {
                throw new Error(`Too few parameters in call to ${funcName}. Expected at least ${minArgCount} found ${argCount}.`)
              }
              // Push the missing default argument values
              const missingArgCount = funcArgCount - argCount;
              const defaultValues = funcDef.getLastNDefaultValues(missingArgCount);
              for (let value of defaultValues) {
                this.opStack.push(value);
              }
            }

            if (funcDef.isNative()) {
              const func = funcDef.getFunction();
              // Build parameter list
              let paramValues = [];
              // Pop param values from stack (even default ones)
              for (let {} of funcDef.argNames) {
                const paramValue = this.opStack.pop();
                paramValues.unshift(paramValue);
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
            }
          }
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
          const accessTarget = this.opStack.pop();
          // pop index
          const index = this.opStack.pop();
          // pop value
          const valueToAssign = this.opStack.pop();

          const isString = typeof accessTarget === "string";
          const isList = accessTarget instanceof Array;
          const isMap = accessTarget instanceof Map;

          if (isList) {
            // Check and compute index
            checkInt(index, "Index must be an integer");
            const effectiveIndex = computeEffectiveIndex(accessTarget, index);
            accessTarget[effectiveIndex] = valueToAssign;
          } else if(isMap) {
            accessTarget.set(index, valueToAssign);
          } else if(isString) {
            throw new Error("Cannot assign to String (immutable)");
          } else {
            throw new Error("Cannot set to element of this type");
          }

          this.ip += 1;
          break;
        }
        case BC.EVAL_ID: {
          const identifier = this.code.arg1[this.ip];
          const value = this.context.get(identifier);

          if (value instanceof BoundFunction) {
            // If it's a function, it should be called.
            // The resulting value will be put in the stack instead.
            const funcDef: FuncDef = value.funcDef;

            if (funcDef.requiredArgCount > 0) {
              throw new Error(`Not enough parameters calling ${identifier}. Required at least: ${funcDef.requiredArgCount}`);
            }

            // Decide how to call function
            if (funcDef.isNative()) {
              let params = [];
              // Use default values, if any
              if (funcDef.argNames.length > 0) {
                params = funcDef.defaultValues;
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
                this.context.setLocal(funcDef.argNames[idx], funcDef.defaultValues[idx]);
              }
              // Set initial ip
              this.ip = 0;  
            }
          } else {
            // If it's not a function, use the value as-is
            this.opStack.push(value)
            this.ip += 1;
          }
          break;
        }
        case BC.INDEXED_ACCESS: {
          const accessTarget = this.opStack.pop();
          const index = this.opStack.pop();

          const isString = typeof accessTarget === "string";
          const isList = accessTarget instanceof Array;
          const isMap = accessTarget instanceof Map;

          if (isList || isString) {
            checkInt(index, "Index must be an integer");
            const effectiveIndex = computeEffectiveIndex(accessTarget, index);
            const element = accessTarget[effectiveIndex];
            this.opStack.push(element);
          } else if(isMap) {
            if (accessTarget.has(index)) {
              const element = accessTarget.get(index);
              this.opStack.push(element);
            } else {
              throw new Error(`Key ${index} not found in Map`);
            }
          } else {
            throw new Error("Cannot perform indexed access on this type");
          }

          this.ip += 1;
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
          let pairCount: number = this.code.arg1[this.ip];
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
          let value: any = this.code.arg1[this.ip];
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
        case BC.COMPARE_EQ: {
          let valueB = this.opStack.pop()
          let valueA = this.opStack.pop()
          if (equals(valueA, valueB)) {
            this.opStack.push(1)
          } else {
            this.opStack.push(0)
          }
          this.ip += 1
          break;
        }
        case BC.COMPARE_NE: {
          let valueB = this.opStack.pop();
          let valueA = this.opStack.pop();
          if (!equals(valueA, valueB)) {
            this.opStack.push(1)
          } else {
            this.opStack.push(0)
          }
          this.ip += 1
          break;
        }
        case BC.COMPARE_GE: {
          let valueB = this.opStack.pop()
          let valueA = this.opStack.pop()
          if (greaterEquals(valueA, valueB)) {
            this.opStack.push(1)
          } else {
            this.opStack.push(0)
          }
          this.ip += 1
          break;
        }
        case BC.COMPARE_GT: {
          let valueB = this.opStack.pop()
          let valueA = this.opStack.pop()
          if (greaterThan(valueA, valueB)) {
            this.opStack.push(1)
          } else {
            this.opStack.push(0)
          }
          this.ip += 1
          break;
        }
        case BC.COMPARE_LE: {
          let valueB = this.opStack.pop()
          let valueA = this.opStack.pop()
          if (lessEquals(valueA, valueB)) {
            this.opStack.push(1)
          } else {
            this.opStack.push(0)
          }
          this.ip += 1
          break;
        }
        case BC.COMPARE_LT: {
          let valueB = this.opStack.pop()
          let valueA = this.opStack.pop()
          if (lessThan(valueA, valueB)) {
            this.opStack.push(1)
          } else {
            this.opStack.push(0)
          }
          this.ip += 1
          break;
        }
        case BC.POP_JUMP_FALSE: {
          let jumpAddr = this.code.arg1[this.ip]
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
          let jumpAddr = this.code.arg1[this.ip];
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
          let jumpAddr = this.code.arg1[this.ip];
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
          let valueInStack_2 = this.opStack.pop()
          let valueInStack_1 = this.opStack.pop()
          let result = add(valueInStack_1, valueInStack_2)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.SUBTRACT_VALUES: {
          let valueInStack_2 = this.opStack.pop()
          let valueInStack_1 = this.opStack.pop()
          let result = subtract(valueInStack_1, valueInStack_2)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.MULTIPLY_VALUES: {
          let valueInStack_2 = this.opStack.pop()
          let valueInStack_1 = this.opStack.pop()
          let result = multiply(valueInStack_1, valueInStack_2)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.DIVIDE_VALUES: {
          let valueInStack_2 = this.opStack.pop()
          let valueInStack_1 = this.opStack.pop()
          let result = divide(valueInStack_1, valueInStack_2)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.POWER_VALUES: {
          let valueInStack_2 = this.opStack.pop()
          let valueInStack_1 = this.opStack.pop()
          let result = power(valueInStack_1, valueInStack_2)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.MOD_VALUES: {
          let valueInStack_2 = this.opStack.pop()
          let valueInStack_1 = this.opStack.pop()
          let result = modulus(valueInStack_1, valueInStack_2)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.LOGIC_AND_VALUES: {
          let valueInStack_2 = this.opStack.pop()
          let valueInStack_1 = this.opStack.pop()
          let result = logic_and(valueInStack_1, valueInStack_2)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.LOGIC_OR_VALUES: {
          let valueInStack_2 = this.opStack.pop()
          let valueInStack_1 = this.opStack.pop()
          let result = logic_or(valueInStack_1, valueInStack_2)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.SUBTR_N: {
          let valueToSubtract = this.code.arg1[this.ip];
          let valueInStack = this.opStack.pop()
          let result = subtract(valueInStack, valueToSubtract)
          this.opStack.push(result)
          this.ip += 1;
          break;
        }
        case BC.DIVIDE_N: {
          let dividend = this.code.arg1[this.ip];
          let valueInStack = this.opStack.pop()
          let result = divide(valueInStack, dividend)
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
          let value = this.opStack.pop()
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
    const isCall = op == BC.CALL;
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

}