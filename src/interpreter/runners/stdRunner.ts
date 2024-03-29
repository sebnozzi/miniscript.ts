import { Code } from "../../vm/code";
import { Processor } from "../../vm/processor";

export class StdRunner {

  constructor(
    private vm: Processor,
    private code: Code) {
    this.vm.prepareForRunning(code);
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

}