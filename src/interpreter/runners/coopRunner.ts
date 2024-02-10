import { Code } from "../../vm/code";
import { Processor } from "../../vm/processor";

export class CooperativeRunner {

  constructor(
    private vm: Processor,
    private code: Code) {
    this.vm.prepareForRunning(code);
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

  getCurrentSourceLocation(): [string?,  number?] {
    const fileName = this.vm.getCurrentSrcFileName();
    const lineNr = this.vm.getCurrentSrcLineNr();
    return [fileName, lineNr];
  }

  isFinished(): boolean {
    const result = this.vm.isFinished();
    return result; 
  }

  get compiledCode(): Code {
    return this.code;
  }

  getLastValue(): any {
    return this.vm.lastValue;
  }

}