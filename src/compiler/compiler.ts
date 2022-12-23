
class Compiler {
  
  private readonly builder: CodeBuilder;

  constructor(private statements: Statement[]) {
    this.builder = new CodeBuilder();
  }
  
  compile(): Code {
    this.compileStatements(this.statements)
    this.builder.push(BC.EXIT)
    const prg = this.builder.build();
    return prg
  }

  private compileStatements(statements: Statement[]) {
    for(const s of statements) {
      this.compileStatement(s)
    } 
  }

  private compileStatement(s: Statement) {
    const b = this.builder;
    if (s instanceof AssignmentStatement) {
      // Compute the value to be assigned
      b.startMapEntry();
      this.compileExpression(s.value)
      // Push bytecode to complete the assignment
      const target = s.target;
      if (target instanceof IdentifierExpr) {
        this.builder.push(BC.ASSIGN_LOCAL, target.identifier.value);
        b.endMapEntry(s.location());
      } else {
        throw new Error("Only assignment to identifier implemented for now")
      }
    } else if (s instanceof ReturnStatement) {
      b.startMapEntry();
      if (s.optValue) {
        this.compileExpression(s.optValue)
      }
      this.builder.push(BC.RETURN);
      b.endMapEntry(s.location());
    } else if (s instanceof IfStatement) {

      let addrNr = 0;

      b.startMapEntry();
      this.compileExpression(s.ifBranch.condition);
      const endIfLabel = b.newLabel();
      this.builder.push_unresolved(BC.JUMP_FALSE, endIfLabel);
      b.endMapEntry(s.ifBranch.condition.location());

      this.compileStatements(s.ifBranch.statements);
      this.builder.define_address(endIfLabel);

      for (let elseIf of s.elseIfs) {
        let elseIfLabel = b.newLabel();
        b.startMapEntry();
        this.compileExpression(elseIf.condition)
        const elseIfIpEnd = b.ip;
        this.builder.push_unresolved(BC.JUMP_FALSE, elseIfLabel)
        b.endMapEntry(elseIf.condition.location());

        this.compileStatements(elseIf.statements);
        this.builder.define_address(elseIfLabel);
      }

      if (s.elseBranch.length > 0) {
        this.compileStatements(s.elseBranch)
      }
  
    } else if (s instanceof FunctionCallStatement) {
      b.startMapEntry();
      this.compileFuncCall(s.callTarget, s.args)
      const callIpEnd = b.ip - 1;
      b.endMapEntry(s.location());
      // TODO: discard return value ... we need a flag to indicate that something was returned
    } else {
      throw new Error("Compilation of statement not implemented: " + typeof s)
    }
  }

  private compileExpression(e: Expression) {
    const b = this.builder;

    if (e instanceof Literal) {
      b.push(BC.PUSH, e.value)
    } else if (e instanceof IdentifierExpr) {
      b.push(BC.PUSH_VAR, e.identifier.value)
    } else if (e instanceof BinaryExpr) {
      this.compileExpression(e.left)
      this.compileExpression(e.right)
      switch (e.operator.tokenType) {
        case TokenType.OP_PLUS: {
          b.push(BC.ADD_VALUES)
          break;
        }
        case TokenType.OP_MINUS: {
          b.push(BC.SUBTRACT_VALUES)
          break;
        }
        case TokenType.OP_LESS_EQUALS: {
          b.push(BC.COMPARE_LE)
          break;
        }
        case TokenType.OP_LESS: {
          b.push(BC.COMPARE_LT)
          break;
        }
        case TokenType.OP_GREATER_EQUALS: {
          b.push(BC.COMPARE_GE)
          break;
        }
        case TokenType.OP_GREATER: {
          b.push(BC.COMPARE_GT)
          break;
        }
        default:
          throw new Error("Operator not implemented: " + TokenType[e.operator.tokenType])
      }
    } else if (e instanceof FunctionCallExpr) {
      this.compileFuncCall(e.callTarget, e.args)
    } else if (e instanceof FunctionBodyExpr) {
      // Resolve argument names
      let argNames: string[] = []
      for (let arg of e.args) {
        argNames.push(arg.name)
      }
      // Compile code
      const funcCompiler = new Compiler(e.statements);
      const funcCode = funcCompiler.compile();
      // Build and push function definition
      let funcDef = new FuncDef(argNames, funcCode);
      b.push(BC.PUSH, funcDef)
    } else {
      throw new Error("Expression type not yet supported: " + typeof e)
    }
  }

  private compileFuncCall(callTarget: Expression, args: Expression[]) {
    // Push parameters
    // TODO: there is no check that the amount of parameters is correct
    // This should happen at runtime. We need to register how many parameters were pushed.
    for (let arg of args) {
      this.compileExpression(arg)
    }
    // Resolve and call target
    if (callTarget instanceof IdentifierExpr) {
      const identifier = callTarget.identifier.value
      this.builder.push(BC.CALL, identifier)
    } else {
      throw new Error("Calling anything other than identifiers not supported")
    }
  }

}