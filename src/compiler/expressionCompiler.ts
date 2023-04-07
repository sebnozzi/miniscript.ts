
class ExpressionCompiler {

  constructor(private builder: CodeBuilder) { }

  compileExpression(e: Expression) {
    const b = this.builder;

    if (e instanceof Literal) {
      b.push(BC.PUSH, e.value)
    } else if (e instanceof IdentifierExpr) {
      b.push(BC.EVAL_ID, e.identifier.value)
    } else if (e instanceof BinaryExpr) {
      this.compileBinaryExpression(e);
    } else if (e instanceof FunctionCallExpr) {
      this.compileFuncCall(e.callTarget, e.args)
    } else if (e instanceof FunctionBodyExpr) {
      this.compileFunctionBodyExpression(e);
    } else {
      throw new Error("Expression type not yet supported: " + typeof e)
    }
  }

  compileFuncCall(callTarget: Expression, args: Expression[]) {
    // Push parameters
    // TODO: there is no check that the amount of parameters is correct
    // This should happen at runtime. We need to register how many parameters were pushed.
    for (let arg of args) {
      this.compileExpression(arg)
    }
    const argCount = args.length;
    // Resolve and call target
    if (callTarget instanceof IdentifierExpr) {
      const identifier = callTarget.identifier.value;
      this.builder.push(BC.CALL, identifier, argCount);
    } else {
      throw new Error("Calling anything other than identifiers not supported")
    }
  }

  private compileBinaryExpression(e: BinaryExpr) {
    this.compileExpression(e.left)
    this.compileExpression(e.right)
    switch (e.operator.tokenType) {
      case TokenType.OP_PLUS: {
        this.builder.push(BC.ADD_VALUES)
        break;
      }
      case TokenType.OP_MINUS: {
        this.builder.push(BC.SUBTRACT_VALUES)
        break;
      }
      case TokenType.OP_LESS_EQUALS: {
        this.builder.push(BC.COMPARE_LE)
        break;
      }
      case TokenType.OP_LESS: {
        this.builder.push(BC.COMPARE_LT)
        break;
      }
      case TokenType.OP_GREATER_EQUALS: {
        this.builder.push(BC.COMPARE_GE)
        break;
      }
      case TokenType.OP_GREATER: {
        this.builder.push(BC.COMPARE_GT)
        break;
      }
      default:
        throw new Error("Operator not implemented: " + TokenType[e.operator.tokenType])
    }
  }

  private compileFunctionBodyExpression(e: FunctionBodyExpr) {
    // Resolve argument names
    let argNames: string[] = [];
    for (let arg of e.args) {
      argNames.push(arg.name);
    }
    // Compile code
    const funcCompiler = new Compiler(e.statements);
    const funcCode = funcCompiler.compile();
    // Build and push function definition
    let funcDef = new FuncDef(argNames, funcCode);
    this.builder.push(BC.PUSH, funcDef);
  }

}