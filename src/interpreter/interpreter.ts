
type DebuggerCallbacks = {
  onSrcChange: (d: Debugger) => void, 
  onFinished: (d: Debugger) => void
}

class Interpreter {

  public onStarted = () => {};
  public onCompiled = (code: Code) => {};
  public onFinished = () => {};

  private optVm: Processor | null = null;

  constructor(private stdoutCallback: TxtCallback, 
    private stderrCallback: TxtCallback) {
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
    if (this.optVm) {
      this.optVm.forceFinish();
    }
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
      this.onFinished();
      return null;
    }
  }

  private runCompiledCode(prgCode: Code) {
    this.onStarted();

    let p = new Processor(prgCode, this.stdoutCallback, this.stderrCallback);
    this.optVm = p;

    addStandardIntrinsics(p);
    addGraphicIntrinsics(p);

    const interpThis = this;

    p.onFinished = function() {
      interpThis.onFinished();
    }
    
    p.run();
  }

  private debugCompiledCode(prgCode: Code, callbacks: DebuggerCallbacks): Debugger {
    this.onStarted();

    let p = new Processor(prgCode, this.stdoutCallback, this.stderrCallback);
    this.optVm = p;

    const d = new Debugger(p);
    
    d.onSrcChange = () => {
      callbacks.onSrcChange(d);
    };
    d.onFinished = () => {
      callbacks.onFinished(d);
    }

    addStandardIntrinsics(p);
    addGraphicIntrinsics(p);

    const interpThis = this;

    p.onFinished = function() {
      interpThis.onFinished();
    }
    
    d.start();
    return d;
  }

}