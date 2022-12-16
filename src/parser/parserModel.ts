// == Statements

interface Statement {}

// An expression found at the level of a statement
class ExpressionStatement implements Statement {
  constructor(public expression: Expression) {}
}

class ConditionedStatements implements Statement {
  constructor(public condition: Expression, public statements: Statement[]) {}
}

class IfStatement implements Statement {
  constructor(public ifBranch: ConditionedStatements,
    public elseIfs: ConditionedStatements[],
    public elseBranch: Statement[]) {}
}

class WhileStatement implements Statement {
  constructor(public condition: Expression, public statements: Statement[]) { }
}

class ForStatement implements Statement {
  constructor(public loopVar: Identifier, public rangeExpr: Expression, public statements: Statement[]) {}
}

class AssignmentStatement implements Statement {
  constructor(public target: Expression, public value: Expression) {}
}

class FunctionCallStatement implements Statement {
  constructor(public callTarget: Expression, public args: Expression[]) {}
}

class ReturnStatement implements Statement {
  constructor(optValue: OptExpression) {}
}

class BreakStatement implements Statement {}
class ContinueStatement implements Statement {}

// == Expressions

interface Expression {}

type OptExpression = Expression | null

type ExpressionPair = {
  key: Expression
  value: Expression
}

class BinaryExpr implements Expression {
  constructor(public left: Expression, public operator: Token, public right: Expression) {}
}

class LogicExpr implements Expression {
  constructor(public left: Expression, public operator: Token, public right: Expression) {}
}

class UnaryExpr implements Expression {
  constructor(public operator: Token, public expr: Expression) {}
}

class Literal implements Expression {
  constructor(public value: any) {}
}

class GroupingExpr implements Expression {
  constructor(public expr: Expression) {}
}

class IdentifierExpr implements Expression {
  constructor(public identifier: Identifier) {}
}

class FunctionCallExpr implements Expression {
  constructor(public callTarget: Expression, public args: Expression[]) {}
}

class ListExpr implements Expression {
  constructor(public elements: Expression[]) {}
}

class MapExpr implements Expression {
  constructor(public elements: ExpressionPair[]) {}
}

class ListAccessExpr implements Expression {
  constructor(public accessTarget: Expression, public indexExpr: Expression) {}
}

class ListSlicingExpr implements Expression {
  constructor(public accessTarget: Expression, public start: OptExpression, public stop: OptExpression) {}
}

class PropertyAccessExpr implements Expression {
  constructor(public accessTarget: Expression, public property: Identifier) {}
}

class Argument {
  constructor(public name: String, public defaultValue: OptExpression) {}
}

class FunctionBodyExpr implements Expression {
  constructor(public args: Argument[], public statements: Statement[]) {}
}

class FunctionRefExpr implements Expression {
  constructor(public refTarget: Expression)  {}
}

class SelfExpr implements Expression {}

class SuperExpr implements Expression {}