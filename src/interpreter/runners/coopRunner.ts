import { Code } from "../../vm/code";
import { Processor } from "../../vm/processor";

export class CooperativeRunner {

  private runnerVm: Processor;

  constructor(
    vm: Processor,
    private code: Code,
    srcName: string | null) {
    this.runnerVm = vm.createSubProcessVM();
    this.runnerVm.setCode(code);
    if (srcName) {
      this.runnerVm.setSourceName(srcName);
    }
    this.runnerVm.setRunAfterSuspended(false);
  }

  runSomeCycles() {
    if (!this.isFinished()) {
      this.runnerVm.runSomeCycles();
    }
  }

  isFinished(): boolean {
    const result = this.runnerVm.isFinished();
    return result; 
  }

  get compiledCode(): Code {
    return this.code;
  }

}