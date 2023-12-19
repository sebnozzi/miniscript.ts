import { Compiler } from "../compiler/compiler";
import { Debugger } from "../debugger/debugger";
import { addStandardIntrinsics } from "../intrinsics/intrinsics";
import { Parser } from "../parser/parser";
import { Statement } from "../parser/parserModel";
import { RuntimeAPI } from "../runtime/runtimeApi";
import { Code } from "../vm/code";
import { Context } from "../vm/context";
import { MSMap } from "../vm/msmap";
import { Processor, TxtCallback } from "../vm/processor";

export type DebuggerCallbacks = {
  onSrcChange: (d: Debugger) => void, 
  onFinished: (d: Debugger) => void
}

export class Interpreter {

  public onStarted = () => {};
  public onCompiled = (_: Code) => {};
  public onFinished = () => {};

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
      const interpThis = this;
      this.vm.onFinished = function() {
        interpThis.processOnFinished();
      }
      addStandardIntrinsics(this.vm);
  }

  runSrcCode(srcCode: string) {
    const code = this.compileSrcCode(srcCode);
    if (code) {
      this.runCompiledCode(code);
    }
  }

  get globalContext(): Context {
    return this.vm.globalContext;
  }

  get runtimeAPI(): RuntimeAPI {
    return this.vm.runtimeAPI;
  }

  addIntrinsic(signature: string, implFn: Function): void {
    this.vm.addIntrinsic(signature, implFn);
  }

  addMapIntrinsic(map: MSMap, signature: string, implFn: Function): void {
    this.vm.addMapIntrinsic(map, signature, implFn);
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

  // Override in subclass if necessary
  protected processOnStarted() {
    this.onStarted();
  }

  // Override in subclass if necessary
  protected processOnCompiledCode(code: Code) {
    this.onCompiled(code);
  }

  // Override in subclass if necessary
  protected processOnFinished() {
    this.onFinished();
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
      this.onCompiled(code);
      return code;
    } else {
      this.processOnFinished();
      return null;
    }
  }

  private runCompiledCode(prgCode: Code) {
    this.processOnStarted();
    
    this.vm.setCode(prgCode);
    this.startRunning();
  }

  protected startRunning() {
    this.vm.run();
  }

  private debugCompiledCode(prgCode: Code, callbacks: DebuggerCallbacks): Debugger {
    this.processOnStarted();

    const d = new Debugger(this.vm);
    const outerThis = this;

    d.onSrcChange = () => {
      callbacks.onSrcChange(d);
    };
    d.onFinished = () => {
      callbacks.onFinished(d);
      outerThis.processOnFinished();
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