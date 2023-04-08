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
    let args = [];
    for (let argIdx = 0; argIdx < argCount; argIdx++) {
      args.push(`arg_${argIdx + 1}`);
    }
    const funcDef = new FuncDef(args, impl);
    this.globalContext.setLocal(name, funcDef);
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
        case BC.CALL_TRANSPILED: {
          let transpiledBlock: Function = this.code.arg1[this.ip];
          transpiledBlock(this);
          break;
        }
        case BC.CALL: {
          let funcName: string = this.code.arg1[this.ip] as string;
          let argCount: number = this.code.arg2[this.ip] as number;

          const resolved: any = this.context.get(funcName);

          if (!(resolved instanceof FuncDef)) {
            throw new Error(`Identifier ${funcName} should be a function`);
          } else {
            const funcDef = resolved as FuncDef;

            if (argCount > funcDef.params.length) {
              throw new Error(`Too many parameters in call to ${funcName}. Expected ${funcDef.params.length} found ${argCount}.`)
            } else if (argCount < funcDef.params.length) {
              throw new Error(`Too few parameters in call to ${funcName}. Expected ${funcDef.params.length} found ${argCount}.`)
            }

            if (funcDef.isNative()) {
              const func = funcDef.getFunction();
              // Build parameter list
              let paramValues = [];
              // Pop and set parameters
              for (let {} of funcDef.params) {
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
              this.context = new Context(this.globalContext);
              this.ip = 0;
    
              // Pop and set parameters as variables
              for (let paramName of funcDef.params) {
                const paramValue = this.opStack.pop();
                this.context.setLocal(paramName, paramValue);
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
          let valueToAssign = this.opStack.pop();
          let varName: string = this.code.arg1[this.ip] as string;
          this.context.setLocal(varName, valueToAssign)
          this.ip += 1;
          break;
        }
        case BC.EVAL_ID: {
          const identifier = this.code.arg1[this.ip];
          const value = this.context.get(identifier);

          if (value instanceof FuncDef) {
            // If it's a function, it should be called.
            // The resulting value will be put in the stack instead.
            const funcDef: FuncDef = value as FuncDef;
            if (funcDef.isNative()) {
              const func = funcDef.getFunction();
              const retVal = func.apply(this, []);
              this.opStack.push(retVal);
              this.ip += 1;
            } else {
              // Let it return to the next bytecode after the call
              this.ip += 1;
              this.pushFrame();
              // Set the new code to run
              this.code = funcDef.getCode();
              this.context = new Context(this.globalContext);
              this.ip = 0;  
            }
          } else {
            // If it's not a function, use the value as-is
            this.opStack.push(value)
            this.ip += 1;
          }
          break;
        }
        case BC.PUSH: {
          let value: number = this.code.arg1[this.ip]
          this.opStack.push(value)
          this.ip += 1
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
          break;
        }
        case BC.JUMP_GE: {
          let jumpAddr = this.code.arg1[this.ip]
          let valueB = this.opStack.pop()
          let valueA = this.opStack.pop()
          if (greaterEquals(valueA, valueB)) {
            this.ip = jumpAddr
          } else {
            this.ip += 1
          }
          break;
        }
        case BC.JUMP_GT: {
          let jumpAddr = this.code.arg1[this.ip]
          let valueB = this.opStack.pop()
          let valueA = this.opStack.pop()
          if (greaterThan(valueA, valueB)) {
            this.ip = jumpAddr
          } else {
            this.ip += 1
          }
          break;
        }
        case BC.JUMP_FALSE: {
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
        case BC.ADD_N: {
          let valueToAdd = this.code.arg1[this.ip];
          let valueInStack = this.opStack.pop()
          let result = add(valueInStack, valueToAdd)
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
          this.opStack.pop()
          this.ip += 1;
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
  }

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

  resolveAndPush(id: string) {
    const value = this.context.get(id)
    this.opStack.push(value)
  }

  pushValue(value: any) {
    this.opStack.push(value)
  }

  compareLessEqual() {
    let valueB = this.opStack.pop()
    let valueA = this.opStack.pop()
    if (lessEquals(valueA, valueB)) {
      this.opStack.push(1)
    } else {
      this.opStack.push(0)
    }
  }

  jumpIfFalse(addr: number) {
    let value = this.opStack.pop()
    if (value == 0) {
      this.ip = addr
    } else {
      this.ip ++;
    }
  }

  doReturn() {
    this.popFrame()
  }

  subtractValues() {
    let valueInStack_2 = this.opStack.pop()
    let valueInStack_1 = this.opStack.pop()
    let result = subtract(valueInStack_1, valueInStack_2)
    this.opStack.push(result)
  }

  resolveAndCall(funcName: string) {
    let funcDef: FuncDef = this.context.get(funcName);
  
    // Let it return to the next bytecode after the call
    this.ip += 1;
    this.pushFrame();

    this.code = funcDef.getCode();
    this.context = new Context(this.globalContext);
    this.ip = 0;

    // Pop and set parameters as variables
    for (let paramName of funcDef.params) {
      const paramValue = this.opStack.pop();
      this.context.setLocal(paramName, paramValue);
    }
  }

  addValues() {
    let valueInStack_2 = this.opStack.pop()
    let valueInStack_1 = this.opStack.pop()
    let result = add(valueInStack_1, valueInStack_2)
    this.opStack.push(result)
  }

}