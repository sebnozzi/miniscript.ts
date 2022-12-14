/// <reference path="./frame.ts"/>
/// <reference path="./code.ts"/>
/// <reference path="./values.ts"/>

class Processor {

  // The instruction pointer. Points to the position in code.
  ip: number;
  // The operation stack. Used for calculations and passing values.
  opStack: Value[];
  // The code to execute.
  code: Code;
  // The current context.
  context: Context;
  // The global context.
  globalContext: Context;
  // Stack of frames (waiting to be returned to; not the current one).
  savedFrames: Frame[];
  // Counter used to return control back to host.
  cycleCount: number;
  // Flag used to signalize that execution is finished.
  finished: boolean;
  // Callback when processing done
  onFinished: Function;

  constructor(initialFrame: Frame) {
    this.code = initialFrame.code;
    this.ip = initialFrame.ip;
    this.globalContext = initialFrame.context;
    this.context = this.globalContext;
    this.savedFrames = [];
    this.opStack = [];
    this.cycleCount = 0;
    this.finished = false;
    this.onFinished = function() {};
  }

  run() {
    this.executeSomeCycles();
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
          let funcDef: FuncDef = this.context.get(funcName).funcValue();
          
          // Let it return to the next bytecode after the call
          this.ip += 1;
          this.pushFrame();

          this.code = funcDef.code;
          this.context = new Context(this.globalContext);
          this.ip = 0;

          // Pop and set parameters as variables
          for (let paramName of funcDef.params) {
            const paramValue = this.opStack.pop();
            if (paramValue) {
              this.context.setLocal(paramName, paramValue);
            } else {
              throw new Error("Stack is empty")
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
          if (valueToAssign) {
            let varName: string = this.code.arg1[this.ip] as string;
            this.context.setLocal(varName, valueToAssign)
            this.ip += 1;
          } else {
            throw new Error("Stack is empty")
          }  
          break;
        }
        case BC.PUSH_VAR: {
          let varName = this.code.arg1[this.ip]
          let value = this.context.get(varName)
          this.opStack.push(value)
          this.ip += 1;
          break;
        }
        case BC.PUSH_INT: {
          let value: number = this.code.arg1[this.ip]
          this.opStack.push(new NumberValue(value))
          this.ip += 1
          break;
        }
        case BC.JUMP_GE: {
          let jumpAddr = this.code.arg1[this.ip]
          let valueB = this.opStack.pop()
          let valueA = this.opStack.pop()
          if (valueA && valueB) {
            if (valueA.greaterEquals(valueB)) {
              this.ip = jumpAddr
            } else {
              this.ip += 1
            };
          } else {
            throw new Error("Stack empty")
          }
          break;
        }
        case BC.JUMP_GT: {
          let jumpAddr = this.code.arg1[this.ip]
          let valueB = this.opStack.pop()
          let valueA = this.opStack.pop()
          if (valueA && valueB) {
            if (valueA.greaterThan(valueB)) {
              this.ip = jumpAddr
            } else {
              this.ip += 1
            };
          } else {
            throw new Error("Stack empty")
          }
          break;
        }
        case BC.ADD_VALUES: {
          let valueInStack_1 = this.opStack.pop()
          let valueInStack_2 = this.opStack.pop()
          if (valueInStack_1 && valueInStack_2) {
            let result = valueInStack_1.add(valueInStack_2)
            this.opStack.push(result)
            this.ip += 1;
          } else {
            throw new Error("Stack empty")
          }
          break;
        }
        case BC.ADD_N: {
          let valueToAdd = new NumberValue(this.code.arg1[this.ip]);
          let valueInStack = this.opStack.pop()
          if (valueInStack) {
            let result = valueInStack.add(valueToAdd)
            this.opStack.push(result)
            this.ip += 1;
          } else {
            throw new Error("Stack empty")
          }
          break;
        }
        case BC.SUBTR_N: {
          let valueToSubtract = new NumberValue(this.code.arg1[this.ip]);
          let valueInStack = this.opStack.pop()
          if (valueInStack) {
            let result = valueInStack.subtract(valueToSubtract)
            this.opStack.push(result)
            this.ip += 1;
          } else {
            throw new Error("Stack empty")
          }
          break;
        }
        case BC.DIVIDE_N: {
          let dividend = new NumberValue(this.code.arg1[this.ip]);
          let valueInStack = this.opStack.pop()
          if (valueInStack) {
            let result = valueInStack.dividedBy(dividend)
            this.opStack.push(result)
            this.ip += 1;
          } else {
            throw new Error("Stack empty")
          }
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
        case BC.PRINT_TOP: {
          let value = this.opStack.pop()
          if (value) {
            console.log("Value: " + value.numberValue())
            this.ip += 1;
          } else {
            throw new Error("Stack empty")
          }
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
    if (frame) {
      this.ip = frame.ip;
      this.context = frame.context;
      this.code = frame.code;
    } else {
      throw new Error("Frame stack empty")
    }
  }

}