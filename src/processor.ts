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

  constructor(code: Code) {
    this.code = code;
    this.ip = 0;
    this.globalContext = new Context();
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
    let opCodes = this.code.opCodes;
    let arg1 = this.code.arg1;
    let arg2 = this.code.arg2;
    let context = this.context;

    let opStack = this.opStack;

    let ip = this.ip;

    while(this.cycleCount < maxCount) {
      switch (opCodes[ip]) {
        case BC.CALL: {
          let funcName: string = arg1[ip] as string;
          let newCode = context.get(funcName).codeValue();
          
          this.pushFrame();

          this.code = newCode;
          this.context = new Context(this.globalContext);
          this.ip = 0;

          // Re-assign local variables
          opCodes = this.code.opCodes;
          arg1 = this.code.arg1;
          arg2 = this.code.arg2;
          context = this.context;
          ip = this.ip;

          break;
        }
        case BC.RETURN: {
          this.popFrame();
          // Re-assign local variables
          opCodes = this.code.opCodes;
          arg1 = this.code.arg1;
          arg2 = this.code.arg2;
          context = this.context;
          ip = this.ip;
          break;
        }
        case BC.ASSIGN_LOCAL: {
          let valueToAssign = opStack.pop();
          if (valueToAssign) {
            let varName: string = arg1[ip] as string;
            context.setLocal(varName, valueToAssign)
            ip += 1;
          } else {
            throw new Error("Stack is empty")
          }  
          break;
        }
        case BC.PUSH_VAR: {
          let varName = arg1[ip]
          let value = context.get(varName)
          opStack.push(value)
          ip += 1;
          break;
        }
        case BC.PUSH_INT: {
          let value: number = arg1[ip]
          opStack.push(new NumberValue(value))
          ip += 1
          break;
        }
        case BC.JUMP_GE: {
          let jumpAddr = arg1[ip]
          let valueB = opStack.pop()
          let valueA = opStack.pop()
          if (valueA && valueB) {
            if (valueA.greaterEquals(valueB)) {
              ip = jumpAddr
            } else {
              ip += 1
            };
          } else {
            throw new Error("Stack empty")
          }
          break;
        }
        case BC.ADD_N: {
          let valueToAdd = new NumberValue(arg1[ip]);
          let valueInStack = opStack.pop()
          if (valueInStack) {
            let result = valueInStack.add(valueToAdd)
            opStack.push(result)
            ip += 1;
          } else {
            throw new Error("Stack empty")
          }
          break;
        }
        case BC.DIVIDE_N: {
          let dividend = new NumberValue(arg1[ip]);
          let valueInStack = opStack.pop()
          if (valueInStack) {
            let result = valueInStack.dividedBy(dividend)
            opStack.push(result)
            ip += 1;
          } else {
            throw new Error("Stack empty")
          }
          break;
        }
        case BC.JUMP: {
          ip = arg1[ip]
          break;
        }
        case BC.EXIT: {
          this.cycleCount = maxCount;
          ip = opCodes.length;
          break;
        }
        case BC.PRINT_TOP: {
          let value = opStack.pop()
          if (value) {
            console.log("Value: " + value.numberValue())
            ip += 1;
          } else {
            throw new Error("Stack empty")
          }
          break;
        }
        default: {
          console.log("ip:", ip);
          console.error("Bytecode not supported: ", opCodes[ip]);
          throw new Error("Bytecode not supported: " + opCodes[ip]);
        }
      } // switch
      this.cycleCount++;
    } // while
    this.cycleCount = 0;
    this.ip = ip;
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