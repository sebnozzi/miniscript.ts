import { Code } from "../../vm/code";
import { Processor } from "../../vm/processor";

export class StdRunner {

  constructor(
    private vm: Processor,
    private code: Code,
    srcName: string | null) {
    this.vm.setCode(code);
    if (srcName) {
      this.vm.setSourceName(srcName);
    }
  }

  async runUntilDone() {
    const vm = this.vm;
    return new Promise<boolean>((resolve) => {
      // This will be called when VM is done running.
      vm.onFinished = () => {
        resolve(true);
      };
      vm.run();
    });
  }

  stop() {
    this.vm.stopRunning();
  }

  isFinished(): boolean {
    const result = this.vm.isFinished();
    return result; 
  }

  get compiledCode(): Code {
    return this.code;
  }

}