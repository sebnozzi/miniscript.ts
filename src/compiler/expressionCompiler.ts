import { Expression, Literal, IdentifierExpr, SelfExpr, SuperExpr, BinaryExpr, UnaryExpr, ChainedComparisonExpr, LogicExpr, GroupingExpr, ListExpr, MapExpr, IndexedAccessExpr, DotAccessExpr, ListSlicingExpr, FunctionCallExpr, FunctionRefExpr, FunctionBodyExpr } from "../parser/parserModel";
import { TokenType } from "../parser/tokenTypes";
import { BC } from "../vm/bytecodes";
import { FuncDef, FuncDefArg } from "../vm/funcdef";
import { CodeBuilder } from "./codebuilder";
import { Compiler } from "./compiler";
import { NotImplemented, CompileTimeError } from "./compilerModel";

export class ExpressionCompilerContext {
  constructor(public readonly isFuncRef: boolean = false, public readonly isStatement: boolean = false) {
  }
  enterFunctionReference(): ECContext {
    const newContext = new ExpressionCompilerContext(true, this.isStatement);
    return newContext;
  }
  enterStatement(): ECContext {
    const newContext = new ExpressionCompilerContext(this.isFuncRef, true);
    return newContext;   
  }
}

export type ECContext = ExpressionCompilerContext;

export class ExpressionCompiler {

  constructor(private builder: CodeBuilder) { }

  compileExpression(e: Expression, context: ECContext | null = null) {
    const b = this.builder;
    context = context == null ? new ExpressionCompilerContext() : context;

    if (e instanceof Literal) {
      b.push(BC.PUSH, e.value)
    } else if (e instanceof IdentifierExpr) {
      this.compileIdentifierExpr(e, context);
    } else if (e instanceof SelfExpr) {
      this.compileSelfExpr();
    } else if (e instanceof SuperExpr) {
      this.compileSuperExpr();
    } else if (e instanceof BinaryExpr) {
      this.compileBinaryExpression(e);
    } else if (e instanceof UnaryExpr) {
      this.compileUnaryExpression(e);
    } else if (e instanceof ChainedComparisonExpr) {
      this.compileChainedComparisonExpression(e);
    } else if (e instanceof LogicExpr) {
      this.compileLogicExpression(e);
    } else if (e instanceof GroupingExpr) {
      this.compileExpression(e.expr, context);
    } else if (e instanceof ListExpr) {
      this.compileListExpression(e);
    } else if (e instanceof MapExpr) {
      this.compileMapExpression(e);
    } else if (e instanceof IndexedAccessExpr) {
      this.compileIndexedAccessExpression(e, context);
    } else if (e instanceof DotAccessExpr) {
      this.compileDotAccessExpression(e, context);
    } else if (e instanceof ListSlicingExpr) {
      this.compileListSlicingExpression(e);
    } else if (e instanceof FunctionCallExpr) {
      this.compileFuncCallExpr(e.callTarget, e.args, context);
    } else if (e instanceof FunctionRefExpr) {
      this.compileFuncRefExpression(e, context);
    } else if (e instanceof FunctionBodyExpr) {
      this.compileFunctionBodyExpression(e);
    } else {
      throw new NotImplemented("Expression type not yet supported: " + e.description())
    }
  }

  compileIdentifierExpr(e: IdentifierExpr, context: ECContext) {
    this.builder.push(BC.EVAL_ID, e.identifier.value, context.isFuncRef);
  }

  compileSelfExpr() {
    this.builder.push(BC.EVAL_ID, "self");
  }

  compileSuperExpr() {
    this.builder.push(BC.EVAL_ID, "super");
  }

  compileFuncCall(callTarget: Expression, args: Expression[]) {
    const context = new ExpressionCompilerContext();
    this.compileFuncCallExpr(callTarget, args, context);
  }

  compileFuncCallExpr(callTarget: Expression, params: Expression[], context: ECContext) {
    const pushParams = () => {
      // Push parameters
      for (let param of params) {
        this.compileExpression(param)
      }
    };
    const paramCount = params.length;
    // Resolve and call target
    if (callTarget instanceof IdentifierExpr) {
      const identifier = callTarget.identifier.value;
      pushParams();
      this.builder.push(BC.CALL, identifier, paramCount);
    } else if(callTarget instanceof DotAccessExpr 
        && callTarget.accessTarget instanceof SuperExpr) {
      const identifier = callTarget.property.value;
      // Push property
      this.builder.push(BC.PUSH, identifier);
      // Push params
      pushParams();
      // Push opcode
      this.builder.push(BC.SUPER_DOT_CALL, paramCount);
    } else if(callTarget instanceof DotAccessExpr) {
      const identifier = callTarget.property.value;
      // Push call target
      this.compileExpression(callTarget.accessTarget);
      // Push property
      this.builder.push(BC.PUSH, identifier);
      // Push params
      pushParams();
      // Push opcode
      this.builder.push(BC.PROPERTY_CALL, paramCount);
    } else if(callTarget instanceof IndexedAccessExpr
        && callTarget.accessTarget instanceof SuperExpr) {
      // Push property
      this.compileExpression(callTarget.indexExpr);
      // Push params
      pushParams();
      // Push opcode
      this.builder.push(BC.SUPER_DOT_CALL, paramCount);
    } else if(callTarget instanceof IndexedAccessExpr) {
      // Push call target
      this.compileExpression(callTarget.accessTarget);
      // Push property
      this.compileExpression(callTarget.indexExpr);
      // Push params
      pushParams();
      // Push opcode
      this.builder.push(BC.PROPERTY_CALL, paramCount);
    } else if(callTarget instanceof FunctionCallExpr) {
      const ctx = context.enterFunctionReference();
      this.compileExpression(callTarget, ctx);
      pushParams();
      this.builder.push(BC.FUNCREF_CALL, paramCount);
    } else {
      throw new CompileTimeError(`Invalid call target: ${callTarget.toJson()}`)
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
      case TokenType.OP_ISA: {
        this.builder.push(BC.COMPARE_ISA)
        break;
      }
      default:
        throw new NotImplemented("Operator not implemented: " + TokenType[e.operator.tokenType])
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
        throw new CompileTimeError("Invalid unary operator. Token type: " + e.operator.tokenType);
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
        case TokenType.OP_EQUALS: {
          this.builder.push(BC.PUSH, "==");
          break;
        }
        case TokenType.OP_NOT_EQUALS: {
          this.builder.push(BC.PUSH, "!=");
          break;
        }
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
          throw new CompileTimeError("Invalid operator found");
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
      throw new CompileTimeError("Invalid logic operator: must be either AND or OR");
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
      this.compileExpression(keyExpr);
      this.compileExpression(valueExpr);
    }
    // Issue opcode to build map
    this.builder.push(BC.BUILD_MAP, elementCount);
  }

  private compileIndexedAccessExpression(e: IndexedAccessExpr, context: ECContext) {
    this.compileExpression(e.accessTarget);
    this.compileExpression(e.indexExpr);
    // If the indexed-access takes place as a statement INVOKE the function
    // Otherwise return the function value
    let isFuncRef: boolean;
    if (context.isStatement) {
      isFuncRef = false;
    } else {
      isFuncRef = true;
    }
    this.builder.push(BC.INDEXED_ACCESS, isFuncRef);
  }

  private compileDotAccessExpression(e: DotAccessExpr, context: ECContext) {
    if (e.accessTarget instanceof SuperExpr) {
      this.builder.push(BC.SUPER_DOT_ACCESS, e.property.value, context.isFuncRef);  
    } else {
      this.compileExpression(e.accessTarget);
      this.builder.push(BC.DOT_ACCESS, e.property.value, context.isFuncRef);
    }
  }

  private compileFuncRefExpression(e: FunctionRefExpr, context: ECContext) {
    const functionReferenceContext = context.enterFunctionReference();
    // Compile the reference-target expression, but in the context
    // of a function reference.
    // This should affect evaluation of single identifiers,
    // indexed-access and dot-access. If the result of these operations
    // is a bound-function, then it should be left in the stack as a value
    // and not immediately evaluated. Anything else can be evaluated as is.
    this.compileExpression(e.refTarget, functionReferenceContext);
  }

  private compileListSlicingExpression(e: ListSlicingExpr) {
    // Push list expression
    this.compileExpression(e.listTarget);
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