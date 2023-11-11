
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
    } else if (e instanceof UnaryExpr) {
      this.compileUnaryExpression(e);
    } else if (e instanceof ChainedComparisonExpr) {
      this.compileChainedComparisonExpression(e);
    } else if (e instanceof LogicExpr) {
      this.compileLogicExpression(e);
    } else if (e instanceof GroupingExpr) {
      this.compileExpression(e.expr);
    } else if (e instanceof ListExpr) {
      this.compileListExpression(e);
    } else if (e instanceof MapExpr) {
      this.compileMapExpression(e);
    } else if (e instanceof IndexedAccessExpr) {
      this.compileIndexedAccessExpression(e);
    } else if (e instanceof PropertyAccessExpr) {
      this.compilePropertyAccessExpression(e);
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
      case TokenType.OP_NOT_EQUALS: {
        this.builder.push(BC.COMPARE_NE)
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

  private compileUnaryExpression(e: UnaryExpr) {
    // Compile expression
    this.compileExpression(e.expr);
    // Push operator
    switch (e.operator.tokenType) {
      case TokenType.OP_NOT: {
        this.builder.push(BC.NEGATE_BOOLEAN);
        break;
      }
      case TokenType.OP_MINUS: {
        this.builder.push(BC.NEGATE_NUMBER);
        break;
      }
      case TokenType.KW_NEW: {
        this.builder.push(BC.NEW_MAP);
        break;
      }
      default: {
        throw new Error("Invalid unary operator. Token type: " + e.operator.tokenType);
      }
    }
  }

  private compileChainedComparisonExpression(e: ChainedComparisonExpr) {
    // Compile and push expressions
    for (let operandExpression of e.operands) {
      this.compileExpression(operandExpression);
    }
    // Push operators
    for (let operator of e.operators) {
      switch (operator.tokenType) {
        case TokenType.OP_GREATER: {
          this.builder.push(BC.PUSH, ">");
          break;
        }        
        case TokenType.OP_GREATER_EQUALS: {
          this.builder.push(BC.PUSH, ">=");
          break;
        }        
        case TokenType.OP_LESS: {
          this.builder.push(BC.PUSH, "<");
          break;
        }        
        case TokenType.OP_LESS_EQUALS: {
          this.builder.push(BC.PUSH, "<=");
          break;
        }        
        default: {
          throw new Error("Invalid operator found");
        }
      }
    }
    // Push special opcode
    const pairCount = e.operators.length;
    this.builder.push(BC.CHAINED_COMPARISON, pairCount);
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
    const elementCount = e.elements.length;
    // Compile all elements
    for (let elementExpr of e.elements) {
      this.compileExpression(elementExpr);
    }
    // Issue opcode to build list
    this.builder.push(BC.BUILD_LIST, elementCount);
  }

  private compileMapExpression(e: MapExpr) {    
    const elementCount = e.elements.size;
    // Compile all key-value pairs
    for (let [keyExpr, valueExpr] of e.elements) {
      this.compileExpression(valueExpr);
      this.compileExpression(keyExpr);
    }
    // Issue opcode to build map
    this.builder.push(BC.BUILD_MAP, elementCount);
  }

  private compileIndexedAccessExpression(e: IndexedAccessExpr) {
    this.compileExpression(e.indexExpr);
    this.compileExpression(e.accessTarget);
    this.builder.push(BC.INDEXED_ACCESS);
  }

  private compilePropertyAccessExpression(e: PropertyAccessExpr) {
    this.compileExpression(e.accessTarget);
    this.builder.push(BC.DOT_ACCESS, e.property.value);
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