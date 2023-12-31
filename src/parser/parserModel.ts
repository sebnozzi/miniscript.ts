// TODO: move the whole toJson thing outside of these models.
// It is only for debugging, they should be external.

import { SrcLocation } from "./commonModel";
import { Token, Identifier } from "./tokenizerModel";
import { TokenType } from "./tokenTypes";

export interface Expression {
  location(): SrcLocation;
  toJson(): object;
  description(): string;
}

type OptExpression = Expression | undefined
type DefaultArgValue = Literal | undefined;

export interface Statement {
  description(): string;
  toJson(): object
}

type jsonCapable = {
  toJson(): object
}

function toJsonArray(elements: jsonCapable[]): object[] {
  let result = []
  for (let e of elements) {
    result.push(e.toJson())
  }
  return result
}

function tokensToJsonArray(tokens: Token[]): any[] {
  let result = [];
  for (let token of tokens) {
    const tokenType = token.tokenType;
    result.push(TokenType[tokenType].toString());
  }
  return result;
}

// == Statements

// An expression found at the level of a statement
export class ExpressionStatement implements Statement {
  constructor(public expression: Expression) {}

  location() {
    return this.expression.location()
  }

  description(): string {
    return "Expression Statement";
  }

  toJson(): object {
    return {
      "ExpressionStatement": {
        "expression": this.expression.toJson()
      }
    }
  }
}

export class ConditionedStatements {
  constructor(public condition: Expression, public statements: Statement[]) {}
  
  location() {
    return this.condition.location();
  }

  toJson(): object {
    return {
      "ConditionedStatements": {
        "condition": this.condition.toJson(),
        "statements": toJsonArray(this.statements)
      }
    }
  }
}


export class IfStatement implements Statement {
  constructor(public ifBranch: ConditionedStatements,
    public elseIfs: ConditionedStatements[],
    public elseBranch: Statement[]) {}
 
  description(): string {
    return "If Statement";
  }

  toJson(): object {
    return {
      "IfStatement": {
        "ifBranch": this.ifBranch.toJson(),
        "elseIfs": toJsonArray(this.elseIfs),
        "elseBranch": toJsonArray(this.elseBranch)
      }
    }
  }
}

export class WhileStatement implements Statement {
  constructor(public condition: Expression, public headerLocation: SrcLocation, public statements: Statement[]) { }
  description(): string {
    return "While Statement";
  }  
  toJson(): object {
    return {
      "WhileStatement": {
        "condition": this.condition.toJson(),
        "statements": toJsonArray(this.statements)
      }
    }
  }
}

export class ForStatement implements Statement {
  constructor(public loopVar: Identifier, public rangeExpr: Expression, public headerLocation: SrcLocation, public statements: Statement[]) {}
  description(): string {
    return "For Statement";
  }
  toJson(): object {
    return {
      "ForStatement": {
        "loopVar": this.loopVar.value,
        "rangeExpr": this.rangeExpr.toJson(),
        "statements": toJsonArray(this.statements)
      }
    }
  }
}

export class AssignmentStatement implements Statement {
  constructor(public target: Expression, public value: Expression) {}
  
  description(): string {
    return "Assignment";
  }

  location() {
    return this.target.location().upTo(this.value.location());
  }

  toJson(): object {
    return {
      "AssignmentStatement": {
        "target": this.target.toJson(),
        "value": this.value.toJson()
      }
    }
  }
}

export class MathAssignmentStatement implements Statement {
  constructor(public target: Expression, public opToken: TokenType, public value: Expression) {}
  
  description(): string {
    return "Math-Assignment";
  }

  location() {
    return this.target.location().upTo(this.value.location());
  }

  toJson(): object {
    return {
      "MathAssignmentStatement": {
        "target": this.target.toJson(),
        "op": TokenType[this.opToken],
        "value": this.value.toJson()
      }
    }
  }
}

export class FunctionCallStatement implements Statement {
  constructor(public callTarget: Expression, public args: Expression[]) {}
  description(): string {
    return "Function Call Statement";
  }
  location(): SrcLocation {
    if (this.args.length > 0) {
      const lastArg = this.args[this.args.length - 1];
      return this.callTarget.location().upTo(lastArg.location());
    } else {
      return this.callTarget.location();
    }
  }
  toJson(): object {
    return {
      "FunctionCallStatement": {
        "callTarget": this.callTarget.toJson(),
        "args": toJsonArray(this.args)
      }
    }
  }
}

export class ReturnStatement implements Statement {
  constructor(public optValue: OptExpression, private fullLocation: SrcLocation) {}
  location() {
    return this.fullLocation;
  }
  description(): string {
    return "Return Statement";
  }
  toJson(): object {
    return {
      "ReturnStatement": {
        "optValue": this.optValue ? this.optValue.toJson() : null
      }
    }
  }
}

export class BreakStatement implements Statement {
  constructor(private fullLocation: SrcLocation) {}
  location() {
    return this.fullLocation;
  }
  description(): string {
    return "Break Statement";
  }
  toJson(): object {
    return {
      "BreakStatement": null
    }
  }
}

export class ContinueStatement implements Statement {
  constructor(private fullLocation: SrcLocation) {}
  location() {
    return this.fullLocation;
  }
  description(): string {
    return "Continue Statement";
  }
  toJson(): object {
    return {
      "ContinueStatement": null
    }
  }
}

// == Expressions

export class BinaryExpr implements Expression {
  constructor(public left: Expression, public operator: Token, public right: Expression) {}
  
  location() {
    return this.left.location().upTo(this.right.location());
  }

  description(): string {
    return "Binary Expression";
  }
  
  toJson(): object {
    return {
      "BinaryExpr": {
        "left": this.left.toJson(),
        "operator": TokenType[this.operator.tokenType],
        "right": this.right.toJson()
      }
    }
  }
}

export class ChainedComparisonExpr {
  constructor(public operands: Expression[], public operators: Token[]) {
    if (operands.length < 3) {
      throw new Error("Amount of operands must be at least 3");
    }
    if (operands.length - 1 != operators.length) {
      throw new Error("Amount of operands/operators mismatch");
    }
    for (let tk of operators) {
      const ttype = tk.tokenType;
      if (ttype != TokenType.OP_EQUALS
          && ttype != TokenType.OP_NOT_EQUALS
          && ttype != TokenType.OP_GREATER 
          && ttype != TokenType.OP_GREATER_EQUALS 
          && ttype != TokenType.OP_LESS
          && ttype != TokenType.OP_LESS_EQUALS){
        throw new Error(`Invalid token type: ${TokenType[ttype]}`);
      }
    }
  }
  
  location(): SrcLocation {
    const firstOperand = this.operands[0];
    const lastOperand = this.operands[this.operands.length - 1];
    return firstOperand.location().upTo(lastOperand.location());
  }

  description(): string {
    return "Binary Expression";
  }
  
  toJson(): object {
    return {
      "ChainedComparison": {
        "operands": toJsonArray(this.operands),
        "operators": tokensToJsonArray(this.operators)
      }
    }
  }
}

export class LogicExpr implements Expression {
  constructor(public left: Expression, public operator: Token, public right: Expression) {}
  
  location(): SrcLocation {
    return this.left.location().upTo(this.right.location());
  }

  description(): string {
    return "Logic Expression";
  }

  toJson(): object {
    return {
      "LogicExpr": {
        "left": this.left.toJson(),
        "operator": TokenType[this.operator.tokenType],
        "right": this.right.toJson()
      }
    }
  }
}

export class UnaryExpr implements Expression {
  constructor(public operator: Token, public expr: Expression) {}

  location(): SrcLocation {
    return this.operator.location.upTo(this.expr.location());
  }

  description(): string {
    return "Unary Expression";
  }

  toJson(): object {
    return {
      "UnaryExpr": {
        "operator": TokenType[this.operator.tokenType],
        "expr": this.expr.toJson()
      }
    }
  }
}

export class Literal implements Expression {
  constructor(public value: any, private fullLocation: SrcLocation) {}
  
  location(): SrcLocation {
    return this.fullLocation;
  }

  description(): string {
    return "Literal";
  }

  toJson(): object {
    return {
      "Literal": {
        "value": this.value
      }
    }
  }
}

export class GroupingExpr implements Expression {
  constructor(public expr: Expression, private fullLocation: SrcLocation) {}
  
  location(): SrcLocation {
    return this.fullLocation;
  }

  description(): string {
    return "Grouping Expression";
  }

  toJson(): object {
    return {
      "GroupingExpr": {
        "expr": this.expr.toJson()
      }
    }
  }
}

export class IdentifierExpr implements Expression {
  constructor(public identifier: Identifier) {}
  
  location(): SrcLocation {
    return this.identifier.location;
  }

  description(): string {
    return "Identifier";
  }

  toJson(): object {
    return {
      "IdentifierExpr": {
        "identifier": this.identifier.value
      }
    }
  }
}

export class FunctionCallExpr implements Expression {
  
  constructor(public callTarget: Expression, public args: Expression[], private fullLocation: SrcLocation) {}

  location(): SrcLocation {
    return this.fullLocation;
  }

  description(): string {
    return "Function Call Expression";
  }

  toJson(): object {
    return {
      "FunctionCallExpr": {
        "callTarget": this.callTarget.toJson(),
        "args": toJsonArray(this.args)
      }
    }
  }
}

export class ListExpr implements Expression {
  
  constructor(public elements: Expression[], private fullLocation: SrcLocation) {}

  location(): SrcLocation {
    return this.fullLocation;
  }

  description(): string {
    return "List Expression";
  }

  toJson(): object {
    return {
      "ListExpr": {
        "elements": toJsonArray(this.elements)
      }
    }
  }
}

export class MapExpr implements Expression {
  
  constructor(public elements: Map<Expression, Expression>, private fullLocation: SrcLocation) {}

  location(): SrcLocation {
    return this.fullLocation;
  }

  description(): string {
    return "Map Expression";
  }

  toJson(): object {
    const entries = []
    for (let [key, value] of this.elements) {
      entries.push({"key": key, "value": value})
    }
    return {
      "MapExpr": {
        "elements": entries
      }
    }
  }
}

export class IndexedAccessExpr implements Expression {
  constructor(public accessTarget: Expression, public indexExpr: Expression, private fullLocation: SrcLocation) {}
  
  location(): SrcLocation {
    return this.fullLocation;
  }

  description(): string {
    return "Indexed Access";
  }

  toJson(): object {
    return {
      "IndexedAccessExpr": {
        "accessTarget": this.accessTarget.toJson(),
        "indexExpr": this.indexExpr.toJson()
      }
    }
  }
}

export class ListSlicingExpr implements Expression {
  constructor(public listTarget: Expression, public start: OptExpression, public stop: OptExpression, private fullLocation: SrcLocation) {}
  
  location(): SrcLocation {
    return this.fullLocation;
  }
  description(): string {
    return "List Slicing";
  }
  toJson(): object {
    return {
      "ListSlicingExpr": {
        "listTarget": this.listTarget.toJson(),
        "start": this.start ? this.start.toJson() : undefined,
        "stop": this.stop ? this.stop.toJson() : undefined
      }
    }
  }
}

export class DotAccessExpr implements Expression {
  constructor(public accessTarget: Expression, public property: Identifier) {}
  
  location(): SrcLocation {
    return this.accessTarget.location().upTo(this.property.location);
  }

  description(): string {
    return "Property Access";
  }
  
  toJson(): object {
    return {
      "DotAccessExpr": {
        "accessTarget": this.accessTarget.toJson(),
        "property": this.property.value
      }
    }
  }
}

export class Argument {
  constructor(public name: string, public defaultValue: DefaultArgValue, private fullLocation: SrcLocation) {}
  
  location(): SrcLocation {
    return this.fullLocation;
  }

  toJson(): object {
    return {
      "Argument": {
        "name": this.name,
        "defaultValue": this.defaultValue ? this.defaultValue.toJson() : "(undefined)"
      }
    }
  }
}

export class FunctionBodyExpr implements Expression {
  
  constructor(public args: Argument[], public statements: Statement[], private fullLocation: SrcLocation) {}

  location(): SrcLocation {
    return this.fullLocation;
  }

  description(): string {
    return "Function Body";
  }

  toJson(): object {
    return {
      "FunctionBodyExpr": {
        "args": toJsonArray(this.args),
        "statements": toJsonArray(this.statements)
      }
    }
  }
}

export class FunctionRefExpr implements Expression {
  constructor(public refTarget: Expression, private fullLocation: SrcLocation)  {}
  
  location(): SrcLocation {
    return this.fullLocation;
  }
  description(): string {
    return "Function Reference";
  }
  toJson(): object {
    return {
      "FunctionRefExpr": {
        "refTarget": this.refTarget.toJson()
      }
    }
  }
}

export class SelfExpr implements Expression {
  constructor(private fullLocation: SrcLocation) {}
  location(): SrcLocation {
    return this.fullLocation;
  }
  description(): string {
    return "Self Expression";
  }
  toJson(): object {
    return {
      "SelfExpr": {}
    }
  }
}

export class SuperExpr implements Expression {
  constructor(private fullLocation: SrcLocation) {}
  location(): SrcLocation {
    return this.fullLocation;
  }
  description(): string {
    return "Super Expression";
  }
  toJson(): object {
    return {
      "SuperExpr": {}
    }
  }
}