
type DebuggerCallbacks = {
  onSrcChange: (d: Debugger) => void, 
  onFinished: (d: Debugger) => void
}

class Interpreter {

  public onStarted = () => {};
  public onCompiled = (code: Code) => {};
  public onFinished = () => {};

  private vm: Processor;

  constructor(
    stdoutCallback: TxtCallback, 
    private stderrCallback: TxtCallback) {
      this.vm = new Processor(stdoutCallback, stderrCallback);
      const interpThis = this;
      this.vm.onFinished = function() {
        interpThis.onFinished();
      }
      addStandardIntrinsics(this.vm);
      addGraphicIntrinsics(this.vm);
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
      this.onFinished();
      return null;
    }
  }

  private runCompiledCode(prgCode: Code) {
    this.onStarted();
    
    this.vm.setCode(prgCode);
    this.vm.run();
  }

  private debugCompiledCode(prgCode: Code, callbacks: DebuggerCallbacks): Debugger {
    this.onStarted();

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

}