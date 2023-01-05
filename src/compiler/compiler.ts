
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
    this.statementCompiler.compileStatements(this.statements)
    this.builder.push(BC.EXIT)
    const prg = this.builder.build();
    return prg
  }

  

}