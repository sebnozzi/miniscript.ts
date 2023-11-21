
// Not to be confused with a runtime-context. This refers to where in the 
// CODE (statically speaking) we are placed. Depending on that, certain 
// things are allowed or not.
class CompilerContext {

  parent: CompilerContext | undefined = undefined;

  constructor() {
    this.parent = undefined;
  }

  insideWhile(): boolean {
    if (this.parent) {
      return this.parent.insideWhile();
    } else {
      return false
    }
  }
  insideForLoop(): boolean {
    if (this.parent) {
      return this.parent.insideForLoop();
    } else {
      return false
    }  
  }
  insideFunctionBody(): boolean {
    if (this.parent) {
      return this.parent.insideFunctionBody();
    } else {
      return false
    }  
  }
  getForLoopNr(): number {
    if (this.parent) {
      return this.parent.getForLoopNr();
    } else {
      return 0
    }
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
  getForLoopNr(): number {
    if (this.parent) {
      // Increase for-loop-nr by one
      return 1 + this.parent.getForLoopNr();
    } else {
      throw new Error("Parent not set");
    }
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
    } else if (s instanceof MathAssignmentStatement) {
      this.compileMathAssignmentStatement(s);
    } else if (s instanceof ReturnStatement) {
      this.compileReturnStatement(s, context);
    } else if (s instanceof IfStatement) {
      this.compileIfStatement(s, context);  
    } else if (s instanceof WhileStatement) {
      this.compileWhileStatement(s, context);  
    } else if (s instanceof ForStatement) {
      this.compileForLoopStatement(s, context);
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
    let exprCompilerContext = new ExpressionCompilerContext();
    // Mark context as "statement". Let the expression compiler
    // know that the expression is an statement-expression.
    // miniScript sometimes behaves differently in this case. 
    exprCompilerContext = exprCompilerContext.enterStatement();
    // Compile expression and discard result
    this.builder.startMapEntry();    
    this.expressionCompiler.compileExpression(s.expression, exprCompilerContext);
    this.builder.push(BC.POP)
    this.builder.endMapEntry(s.location());
  }

  private compileAssignmentStatement(s: AssignmentStatement) {
    this.builder.startMapEntry();
    // Push bytecodes to complete the assignment
    const target = s.target;
    if (target instanceof IdentifierExpr) {
      this.compileExpression(s.value);
      this.builder.push(BC.ASSIGN_LOCAL, target.identifier.value);
    } else if (target instanceof IndexedAccessExpr) {
      this.compileExpression(target.indexExpr);
      this.compileExpression(s.value);
      this.compileExpression(target.accessTarget);
      this.builder.push(BC.ASSIGN_INDEXED);
    } else if (target instanceof DotAccessExpr) {
      // Map to assign into
      this.compileExpression(s.value);
      this.compileExpression(target.accessTarget);
      this.builder.push(BC.DOT_ASSIGN, target.property.value);   
    } else {
      throw new Error("Assignment target not yet supported: " + s.target.description());
    }
    this.builder.endMapEntry(s.location());
  }

  private compileMathAssignmentStatement(s: MathAssignmentStatement) {
    this.builder.startMapEntry();
    // Push bytecodes to complete the assignment
    const target = s.target;
    if (target instanceof IdentifierExpr) {
      this.compileExpression(s.value);
      this.builder.push(BC.MATH_ASSIGN_LOCAL, target.identifier.value, s.opToken);
    } else if (target instanceof IndexedAccessExpr) {
      this.compileExpression(target.accessTarget);
      this.compileExpression(target.indexExpr);
      this.compileExpression(s.value);
      this.builder.push(BC.MATH_ASSIGN_INDEXED, s.opToken);
    } else if (target instanceof DotAccessExpr) {
      this.compileExpression(target.accessTarget);
      this.compileExpression(s.value);
      this.builder.push(BC.MATH_DOT_ASSIGN, target.property.value, s.opToken);   
    } else {
      throw new Error("Assignment target not yet supported: " + s.target.description());
    }
    this.builder.endMapEntry(s.location());
  }

  private compileReturnStatement(s: ReturnStatement, context: CompilerContext) {
    if (context.insideFunctionBody()) {
      this.builder.startMapEntry();
      if (s.optValue) {
        this.compileExpression(s.optValue)
      } else {
        // Push a "null" value if not explicitly returning anything
        this.builder.push(BC.PUSH, null);
      }
      this.builder.push(BC.RETURN);
      this.builder.endMapEntry(s.location());
    } else {
      throw new Error("return outside function body");
    }
  }

  private compileIfStatement(s: IfStatement, context: CompilerContext) {
    // End of only the if / then part
    const endIfThenLabel = this.builder.newLabel();
    // End of the whole if / then / else-ifs block
    const endFullIfBlockLabel = this.builder.newLabel();
    
    this.builder.startMapEntry();
    
    this.compileExpression(s.ifBranch.condition);
    this.builder.push_unresolved(BC.POP_JUMP_FALSE, endIfThenLabel);

    this.builder.endMapEntry(s.ifBranch.condition.location());

    this.compileStatements(s.ifBranch.statements, context);
    this.builder.push_unresolved(BC.JUMP, endFullIfBlockLabel);
    this.builder.define_address(endIfThenLabel);

    for (let elseIf of s.elseIfs) {
      let elseIfLabel = this.builder.newLabel();
      this.builder.startMapEntry();
      this.compileExpression(elseIf.condition)
      const elseIfIpEnd = this.builder.ip;
      this.builder.push_unresolved(BC.POP_JUMP_FALSE, elseIfLabel)
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
    this.builder.push_unresolved(BC.POP_JUMP_FALSE, endWhileLabel);
    this.builder.endMapEntry(s.condition.location());

    // Statements
    const whileContext = new WhileContext(context, startWhileLabel, endWhileLabel);
    this.compileStatements(s.statements, whileContext);

    // Jump to start (loop)
    this.builder.push_unresolved(BC.JUMP, startWhileLabel);

    // Define end
    this.builder.define_address(endWhileLabel);
  }

  private compileForLoopStatement(s: ForStatement, context: CompilerContext) {
    const startForLoopLabel = this.builder.newLabel();
    const endForLoopLabel = this.builder.newLabel();
    const forLoopContext = new ForLoopContext(context);
    const forLoopNr = forLoopContext.getForLoopNr();

    // For loop DEFINITION (happens only once)

    // Push for-loop local variable name
    this.builder.push(BC.PUSH, s.loopVar.value);
    // Push values to iterate over
    this.compileExpression(s.rangeExpr);
    // Push end-address (for "break" or when over)
    this.builder.push_unresolved(BC.PUSH, endForLoopLabel);
    // Push "header" address, for new iterations or continues
    this.builder.push_unresolved(BC.PUSH, startForLoopLabel);
    // Push opcode to create loop
    this.builder.push(BC.CREATE_FOR_LOOP, forLoopNr);

    // For header (control jumps here on every iteration)
    this.builder.startMapEntry();
    this.builder.define_address(startForLoopLabel);
    this.builder.push(BC.ITERATE_FOR_LOOP, forLoopNr);
    this.builder.endMapEntry(s.headerLocation);

    // Statements
    this.compileStatements(s.statements, forLoopContext);

    // Jump to header (to iterate again)
    this.builder.push_unresolved(BC.JUMP, startForLoopLabel);

    // Define end
    this.builder.define_address(endForLoopLabel);
  }

  private compileBreakStatement(s: BreakStatement, context: CompilerContext) {
    if (context.insideWhile() && context instanceof WhileContext) {
      this.builder.startMapEntry();
      // Jump to end of while
      this.builder.push_unresolved(BC.JUMP, context.endLabel);
      this.builder.endMapEntry(s.location());
    } else if (context.insideForLoop() && context instanceof ForLoopContext) {
      this.builder.startMapEntry();
      // Break out of for-loop
      this.builder.push_unresolved(BC.BREAK_FOR_LOOP, context.getForLoopNr());
      this.builder.endMapEntry(s.location());
    } else {
      throw new Error("break outside while / for loop");
    }
  }

  private compileContinueStatement(s: ContinueStatement, context: CompilerContext) {
    if (context.insideWhile() && context instanceof WhileContext) {
      this.builder.startMapEntry();
      // Jump to start of while
      this.builder.push_unresolved(BC.JUMP, context.startLabel);
      this.builder.endMapEntry(s.location());
    } else if (context.insideForLoop() && context instanceof ForLoopContext) {
      this.builder.startMapEntry();
      // Trigger a "continue" in for-loop (jump to header address)
      this.builder.push_unresolved(BC.CONTINUE_FOR_LOOP, context.getForLoopNr());
      this.builder.endMapEntry(s.location());
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