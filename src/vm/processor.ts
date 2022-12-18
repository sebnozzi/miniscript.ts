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
  // Map of primitives
  primitives: {[id: string]: Function};

  constructor(programCode: Code) {
    this.code = programCode;
    this.ip = 0;
    this.globalContext = new Context();
    this.context = this.globalContext;
    this.savedFrames = new Stack<Frame>();
    this.opStack = new Stack();
    this.cycleCount = 0;
    this.onFinished = function() {};
    this.primitives = {};
  }

  run() {
    this.runUntilDone();
  }

  addPrimitive(name: string, impl: Function) {
    this.primitives[name] = impl;
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
          transpiledBlock(this, this.context, this.opStack);
          break;
        }
        case BC.CALL: {
          let funcName: string = this.code.arg1[this.ip] as string;

          // Try to see if it's a primitive
          if (funcName in this.primitives) {
            let prim = this.primitives[funcName];
            prim(this.opStack, this.context);
            this.ip += 1;
          } else {
            let funcDef: FuncDef = this.context.get(funcName);
          
            // Let it return to the next bytecode after the call
            this.ip += 1;
            this.pushFrame();
  
            this.code = funcDef.code;
            this.context = new Context(this.globalContext);
            this.ip = 0;
  
            // Pop and set parameters as variables
            for (let paramName of funcDef.params) {
              const paramValue = this.opStack.pop();
              this.context.setLocal(paramName, paramValue);
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
        case BC.PUSH_VAR: {
          let varName = this.code.arg1[this.ip]
          let value = this.context.get(varName)
          this.opStack.push(value)
          this.ip += 1;
          break;
        }
        case BC.PUSH: {
          let value: number = this.code.arg1[this.ip]
          this.opStack.push(value)
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
          let value = this.opStack.pop()
          if (typeof value == "number") {
            if (value == 0) {
              this.ip = jumpAddr
            } else {
              this.ip += 1
            }
          } else {
            throw new Error("Type not supported: " + value)
          }
          break;
        }
        case BC.ADD_VALUES: {
          let valueInStack_1 = this.opStack.pop()
          let valueInStack_2 = this.opStack.pop()
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
        case BC.CALL_PRIMITIVE: {
          let name = this.code.arg1[this.ip];
          let prim = this.primitives[name];
          if (prim) {
            prim(this.opStack, this.context);
            this.ip += 1;
            break;
          } else {
            throw new Error("Primitive not found: " + name);
          }
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
  }

  popFrame() {
    const frame = this.savedFrames.pop();
    this.ip = frame.ip;
    this.context = frame.context;
    this.code = frame.code;
  }

  resolveAndPush(id: string) {
    const value = this.context.get("n")
    this.opStack.push(value)
  }

  pushNumber(nr: number) {
    this.opStack.push(nr)
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

    this.code = funcDef.code;
    this.context = new Context(this.globalContext);
    this.ip = 0;

    // Pop and set parameters as variables
    for (let paramName of funcDef.params) {
      const paramValue = this.opStack.pop();
      this.context.setLocal(paramName, paramValue);
    }
  }

  addValues() {
    let valueInStack_1 = this.opStack.pop()
    let valueInStack_2 = this.opStack.pop()
    let result = add(valueInStack_1, valueInStack_2)
    this.opStack.push(result)
  }

}