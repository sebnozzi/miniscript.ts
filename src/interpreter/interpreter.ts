
class Interpreter {

  public onStarted = () => {};
  public onCompiled = (code: Code) => {};
  public onFinished = () => {};

  constructor(private stdoutCallback: TxtCallback, 
    private stderrCallback: TxtCallback) {
  }

  runSrcCode(srcCode: string) {
    let parsedStatements: Statement[] = [];

    try {
      const p = new Parser(srcCode);
      parsedStatements = p.parse();
    } catch (e: any) {
      if (e["message"]) {
        this.stderrCallback(e.message);
      }
    }

    if (parsedStatements.length > 0) {
      const compiler = new Compiler(parsedStatements);
      const code = compiler.compile();
      this.onCompiled(code);
      this.runCompiledCode(code);
    } else {
      this.onFinished();
    }

  }

  runCompiledCode(prgCode: Code) {
    this.onStarted();

    let p = new Processor(prgCode, this.stdoutCallback, this.stderrCallback);

    addIntrinsics(p);
    addPrintIntrinsic(p);
    addBaseTypesIntrinsics(p);
    addGraphicIntrinsics(p);

    const interpThis = this;

    p.onFinished = function() {
      interpThis.onFinished();
    }
    
    p.run();
  }

}