import { Code } from "../../vm/code";
import { Processor } from "../../vm/processor";

export class CooperativeRunner {

  constructor(
    private vm: Processor,
    private code: Code,
    srcName: string | null) {
    this.vm.setCode(code);
    if (srcName) {
      this.vm.setSourceName(srcName);
    }
    this.vm.setRunAfterSuspended(false);
  }

  runSomeCycles() {
    if (!this.isFinished()) {
      this.vm.runSomeCycles();
    }
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