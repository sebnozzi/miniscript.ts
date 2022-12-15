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
  // Flag used to signalize that execution is finished.
  finished: boolean;
  // Callback when processing done
  onFinished: Function;
  // Map of primitives
  primitives: {[id: string]: Function};

  constructor(initialFrame: Frame) {
    this.code = initialFrame.code;
    this.ip = initialFrame.ip;
    this.globalContext = initialFrame.context;
    this.context = this.globalContext;
    this.savedFrames = new Stack<Frame>();
    this.opStack = new Stack();
    this.cycleCount = 0;
    this.finished = false;
    this.onFinished = function() {};
    this.primitives = {};
  }

  run() {
    this.executeSomeCycles();
  }

  addPrimitive(name: string, impl: Function) {
    this.primitives[name] = impl;
  }

  executeSomeCycles() {
    if (!this.isFinished()) {
      this.executeCycles(73681)
      window.setTimeout(() => {
        this.executeSomeCycles()
      }, 0)
    } else {
      this.onFinished();
    }
  }

  executeCycles(maxCount: number) {
    while(this.cycleCount < maxCount) {
      switch (this.code.opCodes[this.ip]) {
        case BC.CALL: {
          let funcName: string = this.code.arg1[this.ip] as string;
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
        case BC.ADD_VALUES: {
          let valueInStack_1 = this.opStack.pop()
          let valueInStack_2 = this.opStack.pop()
          let result = add(valueInStack_1, valueInStack_2)
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
    this.cycleCount = 0;
  }

  isFinished(): boolean {
    return this.ip >= this.code.opCodes.length;
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

}