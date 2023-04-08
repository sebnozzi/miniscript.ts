
class StatementCompiler {

  constructor(private builder: CodeBuilder, private expressionCompiler: ExpressionCompiler) { }

  compileStatements(statements: Statement[]) {
    for(const s of statements) {
      this.compileStatement(s)
    } 
  }

  private compileStatement(s: Statement) {
    const b = this.builder;
    if (s instanceof ExpressionStatement) {
      this.compileExpressionStatement(s);
    } else if (s instanceof AssignmentStatement) {
      this.compileAssignmentStatement(s);
    } else if (s instanceof ReturnStatement) {
      this.compileReturnStatement(s);
    } else if (s instanceof IfStatement) {
      this.compileIfStatement(s);  
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
    }
    this.builder.push(BC.RETURN);
    this.builder.endMapEntry(s.location());
  }

  private compileIfStatement(s: IfStatement) {
    // End of only the if / then part
    const endIfThenLabel = this.builder.newLabel();
    // End of the whole if / then / else-ifs block
    const endFullIfBlockLabel = this.builder.newLabel();
    
    this.builder.startMapEntry();
    
    this.compileExpression(s.ifBranch.condition);
    this.builder.push_unresolved(BC.JUMP_FALSE, endIfThenLabel);

    this.builder.endMapEntry(s.ifBranch.condition.location());

    this.compileStatements(s.ifBranch.statements);
    this.builder.push_unresolved(BC.JUMP, endFullIfBlockLabel);
    this.builder.define_address(endIfThenLabel);

    for (let elseIf of s.elseIfs) {
      let elseIfLabel = this.builder.newLabel();
      this.builder.startMapEntry();
      this.compileExpression(elseIf.condition)
      const elseIfIpEnd = this.builder.ip;
      this.builder.push_unresolved(BC.JUMP_FALSE, elseIfLabel)
      this.builder.endMapEntry(elseIf.condition.location());

      this.compileStatements(elseIf.statements);
      this.builder.push_unresolved(BC.JUMP, endFullIfBlockLabel);
      this.builder.define_address(elseIfLabel);
    }

    if (s.elseBranch.length > 0) {
      this.compileStatements(s.elseBranch);
    }

    this.builder.define_address(endFullIfBlockLabel);
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