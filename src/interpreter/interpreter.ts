import { Compiler } from "../compiler/compiler";
import { Debugger } from "../debugger/debugger";
import { addStandardIntrinsics } from "../intrinsics/intrinsics";
import { Parser } from "../parser/parser";
import { Statement } from "../parser/parserModel";
import { Runtime } from "../runtime/runtimeApi";
import { Code } from "../vm/code";
import { Processor, TxtCallback } from "../vm/processor";
import { CooperativeRunner } from "./runners/coopRunner";
import { StdRunner } from "./runners/stdRunner";

export type DebuggerCallbacks = {
  onSrcChange: (d: Debugger) => void, 
  onFinished: (d: Debugger) => void
}

export class Interpreter {

  private stderrCallback: TxtCallback;

  private vm: Processor;
  private _runtime: Runtime;

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
    this._runtime = new Runtime(this.vm);
    addStandardIntrinsics(this.vm);
  }

  async runSrcCode(srcCode: string, srcName?: string): Promise<boolean> {
    const code = this.compileSrcCode(srcCode, srcName);
    if (code) {
      const runner = new StdRunner(this.vm, code);
      const result = await runner.runUntilDone();
      return result;
    } else {
      return false;
    }
  }

  getStandardRunner(srcCode: string, srcName?: string): StdRunner | null {
    const code = this.compileSrcCode(srcCode, srcName);
    if (code) {
      const runner = new StdRunner(this.vm, code);
      return runner;
    } else {
      return null;
    }
  }

  getCooperativeRunner(srcCode: string, srcName?: string): CooperativeRunner | null {
    const code = this.compileSrcCode(srcCode, srcName);
    if (code) {
      const runner = new CooperativeRunner(this.vm, code);
      return runner;
    } else {
      return null;
    }
  }

  get runtime(): Runtime {
    return this._runtime;
  }

  debugSrcCode(srcCode: string, callbacks: DebuggerCallbacks, srcName?: string): Debugger | null {
    const code = this.compileSrcCode(srcCode, srcName);
    if (code) {
      const d = this.debugCompiledCode(code, callbacks);
      return d;
    } else {
      return null;
    }
  }

  // Return a promise that is resolved only when the module code
  // is done running.
  runSrcAsModule(moduleName: string, srcCode: string): Promise<void> {
    const invocationCode = this.compileModuleInvocation(moduleName, srcCode);
    const vm = this.vm;
    const promise = vm.runAtCurrentPosition(invocationCode);
    return promise; 
  }

  stopExecution() {
    this.vm.stopRunning();
  }

  private compileSrcCode(srcCode: string, srcName?: string): Code | null {
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
      const compiler = new Compiler(parsedStatements, srcName);
      const code = compiler.compile();
      return code;
    } else {
      return null;
    }
  }

  private debugCompiledCode(prgCode: Code, callbacks: DebuggerCallbacks): Debugger {

    const vm = this.vm;
    const dbg = new Debugger(vm);

    dbg.onSrcChange = () => {
      callbacks.onSrcChange(dbg);
    };
    dbg.onFinished = () => {
      callbacks.onFinished(dbg);
    }
    
    vm.prepareForRunning(prgCode);
    dbg.start();
    return dbg;
  } 

  private compileModuleInvocation(moduleName: string, srcCode: string): Code {
    const p = new Parser(srcCode);
    const parsedStatements = p.parse();
    const compiler = new Compiler(parsedStatements, `${moduleName}.ms`);
    const code = compiler.compileModuleInvocation(moduleName);
    return code;
  }

}