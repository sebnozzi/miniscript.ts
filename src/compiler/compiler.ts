import { Statement, ReturnStatement } from "../parser/parserModel";
import { BC } from "../vm/bytecodes";
import { Code } from "../vm/code";
import { FuncDef } from "../vm/funcdef";
import { CodeBuilder } from "./codebuilder";
import { ExpressionCompiler } from "./expressionCompiler";
import { CompilerContext, FunctionBodyContext, StatementCompiler } from "./statementCompiler";

export class Compiler {
  
  private readonly builder: CodeBuilder;
  private readonly statementCompiler: StatementCompiler;
  private readonly expressionCompiler: ExpressionCompiler;

  constructor(private statements: Statement[], srcFile?: string) {
    this.builder = new CodeBuilder(srcFile);
    this.expressionCompiler = new ExpressionCompiler(this.builder);
    this.statementCompiler = new StatementCompiler(this.builder, this.expressionCompiler);
  }
  
  compile(): Code {
    const context = new CompilerContext();
    this.statementCompiler.compileStatements(this.statements, context);
    //this.builder.push(BC.EXIT);
    const prg = this.builder.build();
    return prg
  }

  compileModuleInvocation(moduleName: string): Code {
    // Compile statements as if inside a function
    const context = new FunctionBodyContext();
    this.statementCompiler.compileStatements(this.statements, context);
    // Emit a last "return locals"
    this.emitLastReturn(true);
    const moduleStatements = this.builder.build();
    // Build an anonymous function-body containing those statements
    const moduleLoaderBuilder = new CodeBuilder(`${moduleName} (loader)`);
    const moduleBodyFn = new FuncDef([], moduleStatements);
    // Push the function-body as a value into the stack
    moduleLoaderBuilder.push(BC.PUSH, moduleBodyFn);
    // Execute the function-body pushed the step before.
    // As a result of this, the stack should have the "locals"
    moduleLoaderBuilder.push(BC.FUNCREF_CALL, 0);
    // Assign the module-locals to an identifier named after the module
    // in the current context.
    moduleLoaderBuilder.push(BC.ASSIGN_LOCAL, moduleName);
    // Build this and return
    const runnerCode = moduleLoaderBuilder.build();
    return runnerCode;
  }

  compileFunctionBody(): Code {
    const context = new FunctionBodyContext();
    this.statementCompiler.compileStatements(this.statements, context);
    this.emitLastReturn(false);
    const prg = this.builder.build();
    return prg
  } 

  private emitLastReturn(inModuleBody: boolean) {
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
      if (inModuleBody) {
        this.builder.push(BC.EVAL_ID, "locals");
        this.builder.push(BC.RETURN);
      } else {
        // Signialize that this is a "does not return anything" null 
        // by returning undefined.
        this.builder.push(BC.PUSH, undefined);
        this.builder.push(BC.RETURN);
      }
    }
  }

}