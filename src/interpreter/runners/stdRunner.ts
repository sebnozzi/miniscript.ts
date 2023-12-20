import { Code } from "../../vm/code";
import { Processor } from "../../vm/processor";

export class StdRunner {

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
  }

  async runUntilDone() {
    const runnerVm = this.runnerVm;
    return new Promise<boolean>((resolve) => {
      // This will be called when VM is done running.
      runnerVm.onFinished = () => {
        resolve(true);
      };
      runnerVm.run();
    });
  }

  isFinished(): boolean {
    const result = this.runnerVm.isFinished();
    return result; 
  }

  get compiledCode(): Code {
    return this.code;
  }

}