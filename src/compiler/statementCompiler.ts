
class CompilerContext {

  parent: CompilerContext | undefined = undefined;

  constructor() {
    this.parent = undefined;
  }

  insideWhile(): boolean {
    return this.parent !== undefined ? this.parent.insideWhile() : false;
  }
  insideForLoop(): boolean {
    return this.parent !== undefined ? this.parent.insideForLoop() : false;
  }
  insideFunctionBody(): boolean {
    return this.parent !== undefined ? this.parent.insideFunctionBody() : false;
  }
}

class WhileContext extends CompilerContext {

  public readonly startLabel: string;
  public readonly endLabel: string;

  constructor(parent: CompilerContext, startLabel: string, endLabel: string) {
    super();
    this.parent = parent;
    this.startLabel = startLabel;
    this.endLabel = endLabel;
  }
  insideWhile(): boolean {
    return true;
  }
}

class ForLoopContext extends CompilerContext {
  constructor(parent: CompilerContext) {
    super();
    this.parent = parent;
  }
  insideForLoop(): boolean {
    return true;
  }
}

class FunctionBodyContext extends CompilerContext {
  constructor() {
    super();
  }
  insideFunctionBody(): boolean {
    return true;
  }
}

class StatementCompiler {

  constructor(private builder: CodeBuilder, private expressionCompiler: ExpressionCompiler) { }

  compileStatements(statements: Statement[], context: CompilerContext) {
    for(const s of statements) {
      this.compileStatement(s, context)
    } 
  }

  private compileStatement(s: Statement, context: CompilerContext) {
    const b = this.builder;
    if (s instanceof ExpressionStatement) {
      this.compileExpressionStatement(s);
    } else if (s instanceof AssignmentStatement) {
      this.compileAssignmentStatement(s);
    } else if (s instanceof ReturnStatement) {
      this.compileReturnStatement(s);
    } else if (s instanceof IfStatement) {
      this.compileIfStatement(s, context);  
    } else if (s instanceof WhileStatement) {
      this.compileWhileStatement(s, context);  
    } else if (s instanceof ForStatement) {
      this.compileForStatement(s, context);
    } else if (s instanceof BreakStatement) {
      this.compileBreakStatement(s, context);
    } else if (s instanceof ContinueStatement) {
      this.compileContinueStatement(s, context);  
    } else if (s instanceof FunctionCallStatement) {
      this.compileFunctionCallStatement(s);
    } else {
      throw new Error("Compilation of statement not implemented: " + s.description())
    }
  }

  private compileExpression(e: Expression) {
    this.expressionCompiler.compileExpression(e);
  }

  private compileExpressionStatement(s: ExpressionStatement) {
    // Compile expression and discard result
    this.builder.startMapEntry();
    this.expressionCompiler.compileExpression(s.expression);
    this.builder.push(BC.POP)
    this.builder.endMapEntry(s.location());
  }

  private compileAssignmentStatement(s: AssignmentStatement) {
    // Compute the value to be assigned
    this.builder.startMapEntry();
    this.compileExpression(s.value);
    // Push bytecode to complete the assignment
    const target = s.target;
    if (target instanceof IdentifierExpr) {
      this.builder.push(BC.ASSIGN_LOCAL, target.identifier.value);
      this.builder.endMapEntry(s.location());
    } else {
      throw new Error("Only assignment to identifier implemented for now")
    }
  }

  private compileReturnStatement(s: ReturnStatement) {
    this.builder.startMapEntry();
    if (s.optValue) {
      this.compileExpression(s.optValue)
    } else {
      // Push a "null" value if not explicitly returning anything
      this.builder.push(BC.PUSH, null);
    }
    this.builder.push(BC.RETURN);
    this.builder.endMapEntry(s.location());
  }

  private compileIfStatement(s: IfStatement, context: CompilerContext) {
    // End of only the if / then part
    const endIfThenLabel = this.builder.newLabel();
    // End of the whole if / then / else-ifs block
    const endFullIfBlockLabel = this.builder.newLabel();
    
    this.builder.startMapEntry();
    
    this.compileExpression(s.ifBranch.condition);
    this.builder.push_unresolved(BC.JUMP_FALSE, endIfThenLabel);

    this.builder.endMapEntry(s.ifBranch.condition.location());

    this.compileStatements(s.ifBranch.statements, context);
    this.builder.push_unresolved(BC.JUMP, endFullIfBlockLabel);
    this.builder.define_address(endIfThenLabel);

    for (let elseIf of s.elseIfs) {
      let elseIfLabel = this.builder.newLabel();
      this.builder.startMapEntry();
      this.compileExpression(elseIf.condition)
      const elseIfIpEnd = this.builder.ip;
      this.builder.push_unresolved(BC.JUMP_FALSE, elseIfLabel)
      this.builder.endMapEntry(elseIf.condition.location());

      this.compileStatements(elseIf.statements, context);
      this.builder.push_unresolved(BC.JUMP, endFullIfBlockLabel);
      this.builder.define_address(elseIfLabel);
    }

    if (s.elseBranch.length > 0) {
      this.compileStatements(s.elseBranch, context);
    }

    this.builder.define_address(endFullIfBlockLabel);
  }

  private compileWhileStatement(s: WhileStatement, context: CompilerContext) {
    const startWhileLabel = this.builder.newLabel();
    const endWhileLabel = this.builder.newLabel();

    // While header
    this.builder.startMapEntry();
    this.builder.define_address(startWhileLabel);
    this.compileExpression(s.condition);
    this.builder.push_unresolved(BC.JUMP_FALSE, endWhileLabel);
    this.builder.endMapEntry(s.condition.location());

    // Statements
    const whileContext = new WhileContext(context, startWhileLabel, endWhileLabel);
    this.compileStatements(s.statements, whileContext);

    // Jump to start (loop)
    this.builder.push_unresolved(BC.JUMP, startWhileLabel);

    // Define end
    this.builder.define_address(endWhileLabel);
  }

  private compileForStatement(s: ForStatement, context: CompilerContext) {
    throw new Error("TODO: Compilation of for-statement not yet implemented");
  }

  private compileBreakStatement(s: BreakStatement, context: CompilerContext) {
    if (context.insideWhile() && context instanceof WhileContext) {
      // Jump to end of while
      this.builder.push_unresolved(BC.JUMP, context.endLabel);
    } else if (context.insideForLoop()) {
      throw new Error("TODO: break in for-loops not implemented");
    } else {
      throw new Error("break outside while / for loop");
    }
  }

  private compileContinueStatement(s: ContinueStatement, context: CompilerContext) {
    if (context.insideWhile() && context instanceof WhileContext) {
      // Jump to start of while
      this.builder.push_unresolved(BC.JUMP, context.startLabel);
    } else if (context.insideForLoop()) {
      throw new Error("TODO: continue in for-loops not implemented");
    } else {
      throw new Error("continue outside while / for loop");
    }
  }

  private compileFunctionCallStatement(s: FunctionCallStatement) {
    this.builder.startMapEntry();
    this.expressionCompiler.compileFuncCall(s.callTarget, s.args);
    // Discard returned value, since it's a statement
    this.builder.push(BC.POP)
    this.builder.endMapEntry(s.location());
    // TODO: discard return value ... we need a flag to indicate that something was returned
  }

}