
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
    } else if (e instanceof LogicExpr) {
      this.compileLogicExpression(e);
    } else if (e instanceof GroupingExpr) {
      this.compileExpression(e.expr);
    } else if (e instanceof ListExpr) {
      this.compileListExpression(e);
    } else if (e instanceof IndexedAccessExpr) {
      this.compileListAccessExpression(e);
    } else if (e instanceof ListSlicingExpr) {
      this.compileListSlicingExpression(e);
    } else if (e instanceof FunctionCallExpr) {
      this.compileFuncCall(e.callTarget, e.args)
    } else if (e instanceof FunctionBodyExpr) {
      this.compileFunctionBodyExpression(e);
    } else {
      throw new Error("Expression type not yet supported: " + e.description())
    }
  }

  compileFuncCall(callTarget: Expression, args: Expression[]) {
    // Push parameters
     for (let arg of args) {
      this.compileExpression(arg)
    }
    const argCount = args.length;
    // Resolve and call target
    if (callTarget instanceof IdentifierExpr) {
      const identifier = callTarget.identifier.value;
      this.builder.push(BC.CALL, identifier, argCount);
    } else {
      // TODO
      throw new Error("Calling anything other than identifiers not supported")
    }
  }

  private compileBinaryExpression(e: BinaryExpr) {
    this.compileExpression(e.left)
    this.compileExpression(e.right)
    switch (e.operator.tokenType) {
      case TokenType.OP_EQUALS: {
        this.builder.push(BC.COMPARE_EQ)
        break;
      }
      case TokenType.OP_PLUS: {
        this.builder.push(BC.ADD_VALUES)
        break;
      }
      case TokenType.OP_MINUS: {
        this.builder.push(BC.SUBTRACT_VALUES)
        break;
      }
      case TokenType.OP_MULT: {
        this.builder.push(BC.MULTIPLY_VALUES)
        break;
      }
      case TokenType.OP_DIV: {
        this.builder.push(BC.DIVIDE_VALUES)
        break;
      }
      case TokenType.OP_POW: {
        this.builder.push(BC.POWER_VALUES)
        break;
      }
      case TokenType.OP_MOD: {
        this.builder.push(BC.MOD_VALUES)
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

  private compileLogicExpression(e: LogicExpr) {
    // Determine type
    const isAnd = e.operator.tokenType == TokenType.OP_AND;
    const isOr = e.operator.tokenType == TokenType.OP_OR;
    if (!(isAnd || isOr)) {
      throw new Error("Invalid logic operator: must be either AND or OR");
    }
    // Used to short-circuit when further evaluation is not needed.
    // For example "true or something-else" or "false and something-else".
    // This is not only an optimization but expected behaviour.
    const shortCircuitAddr = this.builder.newLabel();

    // Compile expression of the left
    this.compileExpression(e.left);
    
    // Insert short-circuit conditional jump
    if (isAnd) {
      this.builder.push_unresolved(BC.JUMP_IF_FALSE, shortCircuitAddr);
    } else {
      this.builder.push_unresolved(BC.JUMP_IF_TRUE, shortCircuitAddr);
    }

    // The following only executes in case of no short-circuit

    // Compile expression on the right
    this.compileExpression(e.right);

    if (isAnd) {
      this.builder.push(BC.LOGIC_AND_VALUES)
    } else {
      this.builder.push(BC.LOGIC_OR_VALUES)
    }

    // Address to jump to in case of short-circuiting (skipping evaluating the
    // right expression)
    this.builder.define_address(shortCircuitAddr);
  }

  private compileListExpression(e: ListExpr) {
    if (e.hasAllLiteralElements()) {
      const resultList = [];
      for (let element of e.elements) {
        const literal = element as Literal;
        resultList.push(literal.value);
      }
      this.builder.push(BC.PUSH, resultList);
    } else {
      throw new Error("Mixed lists not yet implemented");
    }
  }

  private compileListAccessExpression(e: IndexedAccessExpr) {
    this.compileExpression(e.indexExpr);
    this.compileExpression(e.accessTarget);
    this.builder.push(BC.INDEXED_ACCESS);
  }

  private compileListSlicingExpression(e: ListSlicingExpr) {
    // Push start value
    if (e.start) {
      this.compileExpression(e.start);
    } else {
      this.builder.push(BC.PUSH, null);
    }
    // Push stop value
    if (e.stop) {
      this.compileExpression(e.stop);
    } else {
      this.builder.push(BC.PUSH, null);
    }
    // Push list expression
    this.compileExpression(e.listTarget);
    // Push opcode
    this.builder.push(BC.SLICE_SEQUENCE);
  }

  private compileFunctionBodyExpression(e: FunctionBodyExpr) {
    // Resolve arguments (names / default values)
    const args = [];
    for (let arg of e.args) {
      if (arg.defaultValue) {
        args.push(new FuncDefArg(arg.name, arg.defaultValue.value));
      } else {
        args.push(new FuncDefArg(arg.name, undefined));
      }
    }
    // Compile code
    const funcCompiler = new Compiler(e.statements);
    const funcCode = funcCompiler.compileFunctionBody();
    // Build and push function definition
    let funcDef = new FuncDef(args, funcCode);
    this.builder.push(BC.PUSH, funcDef);
  }

}