import { Compiler } from "../compiler/compiler";
import { Debugger } from "../debugger/debugger";
import { addStandardIntrinsics } from "../intrinsics/intrinsics";
import { Parser } from "../parser/parser";
import { Statement } from "../parser/parserModel";
import { Runtime } from "../runtime/runtimeApi";
import { Code } from "../vm/code";
import { Processor, TxtCallback } from "../vm/processor";
import { CooperativeRunner } from "./coopRunner";

export type DebuggerCallbacks = {
  onSrcChange: (d: Debugger) => void, 
  onFinished: (d: Debugger) => void
}

export class Interpreter {

  private stderrCallback: TxtCallback;

  protected vm: Processor;

  constructor(
    stdoutCallback: TxtCallback | null = null, 
    stderrCallback: TxtCallback | null = null) {
      if (!stdoutCallback) {
        stdoutCallback = (line: string) => {
          console.log(line);
        }
      }
      if (!stderrCallback) {
        stderrCallback = stdoutCallback;
      }
      this.stderrCallback = stderrCallback;
      this.vm = new Processor(stdoutCallback, stderrCallback);
      addStandardIntrinsics(this.vm);
  }

  async runSrcCode(srcCode: string, srcName: string | null = null): Promise<boolean> {
    const code = this.compileSrcCode(srcCode);
    if (code) {
      const runnerVm = this.vm.createSubProcessVM();
      return new Promise<boolean>((resolve) => {
        // This will be called when VM is done running.
        runnerVm.onFinished = () => {
          resolve(true);
        };
        runnerVm.setCode(code);
        if (srcName) {
          runnerVm.setSourceName(srcName);
        }
        runnerVm.run();
      });
    } else {
      return false;
    }
  }

  getCooperativeRunner(srcCode: string, srcName: string | null = null): CooperativeRunner | null {
    const code = this.compileSrcCode(srcCode);
    if (code) {
      const runner = new CooperativeRunner(this.vm, code, srcName);
      return runner;
    } else {
      return null;
    }
  }

  get runtime(): Runtime {
    return this.vm.runtime;
  }

  debugSrcCode(srcCode: string, callbacks: DebuggerCallbacks): Debugger | null {
    const code = this.compileSrcCode(srcCode);
    if (code) {
      const d = this.debugCompiledCode(code, callbacks);
      return d;
    } else {
      return null;
    }
  }

  // Return a promise that is resolved only when the module code
  // is done running.
  runSrcAsModule(moduleName: string, srcCode: string): Promise<null> {
    const invocationCode = this.compileModuleInvocation(moduleName, srcCode);
    const subVM = this.vm.createSubProcessVM();
    subVM.setCode(invocationCode);
    subVM.setSourceName(`module ${moduleName}`);
    const promise = new Promise<null>((resolve) => {
      subVM.onFinished = () => {
        resolve(null);
      };
      subVM.runUntilDone();
    });
    return promise; 
  }

  stopExecution() {
    this.vm.stopRunning();
  }

  private compileSrcCode(srcCode: string): Code | null {
    let parsedStatements: Statement[] = [];

    try {
      const p = new Parser(srcCode);
      parsedStatements = p.parse();
    } catch (e: any) {
      if (e["message"]) {
        console.error(e);
        this.stderrCallback(e.message);
      }
    }

    if (parsedStatements.length > 0) {
      const compiler = new Compiler(parsedStatements);
      const code = compiler.compile();
      return code;
    } else {
      return null;
    }
  }

  private debugCompiledCode(prgCode: Code, callbacks: DebuggerCallbacks): Debugger {

    const d = new Debugger(this.vm);

    d.onSrcChange = () => {
      callbacks.onSrcChange(d);
    };
    d.onFinished = () => {
      callbacks.onFinished(d);
    }
    
    this.vm.setCode(prgCode);
    d.start();
    return d;
  } 

  private compileModuleInvocation(moduleName: string, srcCode: string): Code {
    const p = new Parser(srcCode);
    const parsedStatements = p.parse();
    const compiler = new Compiler(parsedStatements);
    const code = compiler.compileModuleInvocation(moduleName);
    return code;
  }

}