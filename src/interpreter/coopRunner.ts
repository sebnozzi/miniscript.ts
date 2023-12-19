import { Code } from "../vm/code";
import { Processor } from "../vm/processor";

export class CooperativeRunner {

  private runnerVm: Processor;

  constructor(
    vm: Processor,
    code: Code,
    srcName: string | null) {
    this.runnerVm = vm.createSubProcessVM();
    this.runnerVm.setCode(code);
    if (srcName) {
      this.runnerVm.setSourceName(srcName);
    }
  }

  runSomeCycles() {
    if (!this.isFinished()) {
      this.runnerVm.runCyclesOnce();
    }
  }

  isFinished(): boolean {
    const result = this.runnerVm.isFinished();
    return result; 
  }

}