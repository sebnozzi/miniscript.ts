import { Stack } from "../lib/stack";
import { Code } from "./code";
import { ForLoopContext } from "./forloop";
import { Frame } from "./frame";
import { Processor } from "./processor";

export class ProcessorState {

  ip: number;
  opStack: Stack<any>;
  code: Code;
  forLoopContext: ForLoopContext;
  savedFrames: Stack<Frame>;
  cycleCount: number;
  onResumingExecution: () => void;
  onFinished: () => void;
  suspended: boolean;

  constructor(vm: Processor) {
    this.code = vm.code;
    this.ip = vm.ip;
    this.suspended = vm.suspended;
    this.forLoopContext = vm.forLoopContext;
    this.savedFrames = vm.savedFrames;
    this.opStack = vm.opStack;
    this.cycleCount = vm.cycleCount;
    this.onResumingExecution = vm.onResumingExecution;
    this.onFinished = vm.onFinished;
  }

  static resetState(vm: Processor) {
    vm.ip = 0;
    vm.suspended = false;
    vm.forLoopContext = new ForLoopContext();
    vm.savedFrames = new Stack();
    vm.opStack = new Stack();
    vm.cycleCount = 0;
    vm.onResumingExecution = () => {};
    vm.onFinished = () => {};  
  }

  restoreState(vm: Processor) {
    vm.code = this.code;
    vm.ip = this.ip;
    vm.suspended = this.suspended;
    vm.forLoopContext = this.forLoopContext;
    vm.savedFrames = this.savedFrames;
    vm.opStack = this.opStack;
    vm.cycleCount = this.cycleCount;
    vm.onResumingExecution = this.onResumingExecution;
    vm.onFinished = this.onFinished;   
  }

}