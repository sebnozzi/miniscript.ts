import { Compiler } from "../compiler/compiler";
import { Debugger } from "../debugger/debugger";
import { addStandardIntrinsics } from "../intrinsics/intrinsics";
import { Parser } from "../parser/parser";
import { Statement } from "../parser/parserModel";
import { Code } from "../vm/code";
import { Processor, TxtCallback } from "../vm/processor";

export type DebuggerCallbacks = {
  onSrcChange: (d: Debugger) => void, 
  onFinished: (d: Debugger) => void
}

export class Interpreter {

  public onStarted = () => {};
  public onCompiled = (_: Code) => {};
  public onFinished = () => {};

  protected vm: Processor;

  constructor(
    stdoutCallback: TxtCallback, 
    private stderrCallback: TxtCallback) {
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

  debugSrcCode(srcCode: string, callbacks: DebuggerCallbacks): Debugger | null {
    const code = this.compileSrcCode(srcCode);
    if (code) {
      const d = this.debugCompiledCode(code, callbacks);
      return d;
    } else {
      return null;
    }
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

}