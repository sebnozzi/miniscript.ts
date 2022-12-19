// TODO: move the whole toJson thing outside of these models.
// It is only for debugging, they should be external.

interface Expression {
  location(): SrcLocation;
  toJson(): object
}

type OptExpression = Expression | undefined

interface Statement {
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

// == Statements

// An expression found at the level of a statement
class ExpressionStatement implements Statement {
  constructor(public expression: Expression) {}

  location() {
    return this.expression.location()
  }

  toJson(): object {
    return {
      "ExpressionStatement": {
        "expression": this.expression.toJson()
      }
    }
  }
}

class ConditionedStatements {
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


class IfStatement implements Statement {
  constructor(public ifBranch: ConditionedStatements,
    public elseIfs: ConditionedStatements[],
    public elseBranch: Statement[]) {}
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

class WhileStatement implements Statement {
  constructor(public condition: Expression, public headerLocation: SrcLocation, public statements: Statement[]) { }
  toJson(): object {
    return {
      "WhileStatement": {
        "condition": this.condition.toJson(),
        "statements": toJsonArray(this.statements)
      }
    }
  }
}

class ForStatement implements Statement {
  constructor(public loopVar: Identifier, public rangeExpr: Expression, public headerLocation: SrcLocation, public statements: Statement[]) {}
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

class AssignmentStatement implements Statement {
  constructor(public target: Expression, public value: Expression) {}
  
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

class FunctionCallStatement implements Statement {
  constructor(public callTarget: Expression, public args: Expression[]) {}
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

class ReturnStatement implements Statement {
  constructor(public optValue: OptExpression, private fullLocation: SrcLocation) {}
  location() {
    return this.fullLocation;
  }
  toJson(): object {
    return {
      "ReturnStatement": {
        "optValue": this.optValue ? this.optValue.toJson() : null
      }
    }
  }
}

class BreakStatement implements Statement {
  constructor(private fullLocation: SrcLocation) {}
  location() {
    return this.fullLocation;
  }
  toJson(): object {
    return {
      "BreakStatement": null
    }
  }
}
class ContinueStatement implements Statement {
  constructor(private fullLocation: SrcLocation) {}
  location() {
    return this.fullLocation;
  }
  toJson(): object {
    return {
      "ContinueStatement": null
    }
  }
}

// == Expressions

class BinaryExpr implements Expression {
  constructor(public left: Expression, public operator: Token, public right: Expression) {}
  
  location() {
    return this.left.location().upTo(this.right.location());
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

class LogicExpr implements Expression {
  constructor(public left: Expression, public operator: Token, public right: Expression) {}
  
  location() {
    return this.left.location().upTo(this.right.location());
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

class UnaryExpr implements Expression {
  constructor(public operator: Token, public expr: Expression) {}

  location() {
    return this.operator.location.upTo(this.expr.location());
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

class Literal implements Expression {
  constructor(public value: any, private fullLocation: SrcLocation) {}
  
  location(): SrcLocation {
    return this.fullLocation;
  }

  toJson(): object {
    return {
      "Literal": {
        "value": this.value
      }
    }
  }
}

class GroupingExpr implements Expression {
  constructor(public expr: Expression, private fullLocation: SrcLocation) {}
  
  location(): SrcLocation {
    return this.fullLocation;
  }

  toJson(): object {
    return {
      "GroupingExpr": {
        "expr": this.expr.toJson()
      }
    }
  }
}

class IdentifierExpr implements Expression {
  constructor(public identifier: Identifier) {}
  
  location() {
    return this.identifier.location;
  }

  toJson(): object {
    return {
      "IdentifierExpr": {
        "identifier": this.identifier.value
      }
    }
  }
}

class FunctionCallExpr implements Expression {
  
  constructor(public callTarget: Expression, public args: Expression[], private fullLocation: SrcLocation) {}

  location() {
    return this.fullLocation;
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

class ListExpr implements Expression {
  
  constructor(public elements: Expression[], private fullLocation: SrcLocation) {}

  location() {
    return this.fullLocation;
  }

  toJson(): object {
    return {
      "ListExpr": {
        "elements": toJsonArray(this.elements)
      }
    }
  }
}

class MapExpr implements Expression {
  
  constructor(public elements: Map<Expression, Expression>, private fullLocation: SrcLocation) {}

  location() {
    return this.fullLocation;
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

class ListAccessExpr implements Expression {
  constructor(public accessTarget: Expression, public indexExpr: Expression, private fullLocation: SrcLocation) {}
  location(): SrcLocation {
    return this.fullLocation;
  }
  toJson(): object {
    return {
      "ListAccessExpr": {
        "accessTarget": this.accessTarget.toJson(),
        "indexExpr": this.indexExpr.toJson()
      }
    }
  }
}

class ListSlicingExpr implements Expression {
  constructor(public accessTarget: Expression, public start: OptExpression, public stop: OptExpression, private fullLocation: SrcLocation) {}
  location(): SrcLocation {
    return this.fullLocation;
  }
  toJson(): object {
    return {
      "ListSlicingExpr": {
        "accessTarget": this.accessTarget.toJson(),
        "start": this.start ? this.start.toJson() : undefined,
        "stop": this.stop ? this.stop.toJson() : undefined
      }
    }
  }
}

class PropertyAccessExpr implements Expression {
  constructor(public accessTarget: Expression, public property: Identifier) {}
  
  location(): SrcLocation {
    return this.accessTarget.location().upTo(this.property.location);
  }
  
  toJson(): object {
    return {
      "PropertyAccessExpr": {
        "accessTarget": this.accessTarget.toJson(),
        "property": this.property.value
      }
    }
  }
}

class Argument {
  constructor(public name: string, public defaultValue: OptExpression, private fullLocation: SrcLocation) {}
  
  location() {
    return this.fullLocation;
  }

  toJson(): object {
    return {
      "Argument": {
        "name": this.name,
        "defaultValue": this.defaultValue ? this.defaultValue.toJson() : undefined
      }
    }
  }
}

class FunctionBodyExpr implements Expression {
  
  constructor(public args: Argument[], public statements: Statement[], private fullLocation: SrcLocation) {}

  location() {
    return this.fullLocation;
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

class FunctionRefExpr implements Expression {
  constructor(public refTarget: Expression, private fullLocation: SrcLocation)  {}
  location() {
    return this.fullLocation;
  }
  toJson(): object {
    return {
      "FunctionRefExpr": {
        "refTarget": this.refTarget.toJson()
      }
    }
  }
}

class SelfExpr implements Expression {
  constructor(private fullLocation: SrcLocation) {}
  location() {
    return this.fullLocation;
  }
  toJson(): object {
    return {
      "SelfExpr": {}
    }
  }
}

class SuperExpr implements Expression {
  constructor(private fullLocation: SrcLocation) {}
  location() {
    return this.fullLocation;
  }
  toJson(): object {
    return {
      "SuperExpr": {}
    }
  }
}