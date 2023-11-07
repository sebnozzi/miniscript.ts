
class Compiler {
  
  private readonly builder: CodeBuilder;
  private readonly statementCompiler: StatementCompiler;
  private readonly expressionCompiler: ExpressionCompiler;

  constructor(private statements: Statement[]) {
    this.builder = new CodeBuilder();
    this.expressionCompiler = new ExpressionCompiler(this.builder);
    this.statementCompiler = new StatementCompiler(this.builder, this.expressionCompiler);
  }
  
  compile(): Code {
    const context = new CompilerContext();
    this.statementCompiler.compileStatements(this.statements, context);
    this.builder.push(BC.EXIT);
    const prg = this.builder.build();
    return prg
  }

  compileFunctionBody(): Code {
    const context = new FunctionBodyContext();
    this.statementCompiler.compileStatements(this.statements, context);
    this.emitLastReturn();
    const prg = this.builder.build();
    return prg
  } 

  private emitLastReturn() {
    // Emit a last "return null" statement if the compiled statements
    // do not end with a "return XXX"
    let emitReturn = true;
    if (this.statements.length > 0) {
      const lastStatement = this.statements[this.statements.length - 1];
      if (lastStatement instanceof ReturnStatement) {
        emitReturn = false;
      }
    }
    if (emitReturn) {
      this.builder.push(BC.PUSH, null);
      this.builder.push(BC.RETURN);
    }
  }

}