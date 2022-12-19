
class ParsingContext {

  constructor(
    public insideFunction: boolean = false,
    public insideLoop: boolean = false,
    public insideSingleLineThen: boolean = false,
    public parsingStatementExpr: boolean = false) {}

  enterFunction(): ParsingContext {
    const copy = this.copy();
    copy.insideFunction = true;
    return copy;
  }

  enterLoop(): ParsingContext {
    const copy = this.copy();
    copy.insideLoop = true;
    return copy;
  }

  enterSingleLineThen(): ParsingContext {
    const copy = this.copy();
    copy.insideSingleLineThen = true;
    return copy;
  }

  enterParsingStatementExpr(): ParsingContext {
    const copy = this.copy();
    copy.parsingStatementExpr = true;
    return copy;
  }

  private copy(): ParsingContext {
    return new ParsingContext(
      this.insideFunction,
      this.insideLoop,
      this.insideSingleLineThen,
      this.parsingStatementExpr)
  }
}

class Parser {

  private readonly defaultContext = new ParsingContext()
  private current: number = 0
  private tokens: Token[] = []

  constructor(private input: string) {}

  parse(): Statement[] {
    this.tokens = this.tokenize(this.input)
    const statements = this.parseUntil([], this.defaultContext)
    return statements
  }

  private tokenize(input: string): Token[] {
    const tokenizer = new Tokenizer(input = input)
    const tokens = tokenizer.tokenize()
    const tokensWithSomeLineBreaksRemoved = this.removeSuperfluousLineBreaks(tokens)
    return tokensWithSomeLineBreaksRemoved
  }

  /**
   * Some expressions make it possible to insert newlines and have them continue
   * in the next line.
   *
   * For example:
   *
   * [1, 2,
   *  3 ]
   *
   * Or:
   *
   * x ==
   * 3
   *
   * This function eliminates those newline tokens so that parsing
   * can proceed in a normal way, as if they were not there to begin with.
   * */
  //  - comma (in call expr / statement, in map / list)
  //  - open brackets (or all kinds)
  //  - colon (for slicing)
  //  - not
  //  - unary minus
  //  - new
  //  - @ (address of)
  //  - power ^
  //  - isa
  //  - dot (call)
  //  - logic operators
  //  - comparison operator
  //  - binary (algebr.) operator
  private removeSuperfluousLineBreaks(tokens: Token[]): Token[] {
    const typesThatAllowLineBreaks = [
      TokenType.COMMA,
      TokenType.OPEN_ROUND,
      TokenType.OPEN_SQUARE,
      TokenType.OPEN_CURLY,
      TokenType.COLON,
      TokenType.OP_NOT,
      TokenType.KW_NEW,
      TokenType.OP_FUNCREF,
      TokenType.OP_POW,
      TokenType.OP_ISA,
      TokenType.DOT,
      TokenType.OP_LESS,
      TokenType.OP_LESS_EQUALS,
      TokenType.OP_GREATER,
      TokenType.OP_GREATER_EQUALS,
      TokenType.OP_EQUALS,
      TokenType.OP_NOT_EQUALS,
      TokenType.OP_PLUS,
      TokenType.OP_MINUS,
      TokenType.OP_MULT,
      TokenType.OP_DIV,
      TokenType.OP_AND,
      TokenType.OP_OR,
      TokenType.ASSIGN,
    ]

    let cleanedUpTokens: Token[] = []
    let idx = 0

    while (idx < tokens.length) {
      const token = tokens[idx]
      const tokenType = token.tokenType

      if (typesThatAllowLineBreaks.includes(tokenType)) {
        // Add
        cleanedUpTokens.push(token)
        // Advance
        idx += 1
        // Consume newlines
        var shouldConsume = true
        while (shouldConsume && idx < tokens.length) {
          const maybeNewLine = tokens[idx]
          if (maybeNewLine.tokenType == TokenType.NEWLINE) {
            idx += 1
          } else {
            shouldConsume = false
          }
        }
      } else {
        // Add
        cleanedUpTokens.push(token)
        // Advance
        idx += 1
      }
    }

    return cleanedUpTokens
  }

  private parseUntil(stoppingTokenTypes: TokenType[], context: ParsingContext): Statement[] {
    let shouldContinue = true
    let statements: Statement[] = []

    while (!this.isAtEnd() && shouldContinue) {
      // Discard newlines / semicolons at this stage
      // (they are still useful as part of some statements though, e.g. after a while condition)
      if (this.tokenMatch(TokenType.NEWLINE) || this.tokenMatch(TokenType.SEMICOLON)) {
        // discard / skip
      } else {
        // Check if we reached a "stopping" token type
        // (we might be in the middle of an if / function block)
        for (let stoppingTokenType of stoppingTokenTypes) {
          if (this.check(stoppingTokenType)) {
            shouldContinue = false
          }
        }

        // Only parse statement if we did not reach a stopping token-type
        if (shouldContinue) {
          const s = this.statement(context)
          statements.push(s)
        }
      }
    }

    return statements
  }

  private statement(context: ParsingContext): Statement {
    if (this.tokenMatch(TokenType.KW_IF)) {
      return this.ifStatement(context)
    } else if (this.tokenMatch(TokenType.KW_WHILE)) {
      return this.whileStatement(context)
    } else if (this.tokenMatch(TokenType.KW_FOR)) {
      return this.forStatement(context)
    } else {
      return this.nonBlockStatement(context)
    }
  }

  /**
   * These statements can be appear as part of single-line statements
   * */
  private nonBlockStatement(context: ParsingContext): Statement {
    if (this.tokenMatch(TokenType.KW_BREAK)) {
      return this.breakStatement(context)
    } else if (this.tokenMatch(TokenType.KW_CONTINUE)) {
      return this.continueStatement(context)
    } else if (this.tokenMatch(TokenType.KW_RETURN)) {
      return this.returnStatement(context)
    } else if (this.tokensInStatementBoundaryMatch(TokenType.ASSIGN)) {
      // Looks like an assignment
      return this.assignmentStatement(context)
    } else {
      return this.expressionStatement(context)
    }
  }

  private ifStatement(context: ParsingContext): IfStatement {
    const condition = this.expression(context)
    this.consume(TokenType.KW_THEN, "Expected 'then' after condition. Found: " + this.peek())

    // Decide here: if next token is NEWLINE / SEMICOLON then we have a multi-line if / then / else
    // Otherwise treat a single-line-if
    if (this.tokenMatch(TokenType.NEWLINE, TokenType.SEMICOLON)) {
      // Treat as multi-line if then / [else if]* / [else] / end if
      return this.multiLineIf(condition, context)
    } else {
      return this.singleLineIf(condition, context)
    }
  }

  private multiLineIf(condition: Expression, context: ParsingContext): IfStatement {
    // Consume statements until "else" or "end if" found - don't consume ending token
    const ifStatements = this.parseUntil([TokenType.KW_ELSE_IF, TokenType.KW_ELSE, TokenType.KW_END_IF], context)
    const ifBranch = new ConditionedStatements(condition, ifStatements)   

    // ELSE-IF(s)
    let elseIfs: ConditionedStatements[] = []
    while (this.tokenMatch(TokenType.KW_ELSE_IF)) {
      let elseIfCondition = this.expression(context)
      this.consume(TokenType.KW_THEN, "Expected 'then' after condition in else-if")
      const elseIfStatements = this.parseUntil([TokenType.KW_ELSE_IF, TokenType.KW_ELSE, TokenType.KW_END_IF], context)
      const elseIf = new ConditionedStatements(elseIfCondition, elseIfStatements)
      elseIfs.push(elseIf)
    }

    // ELSE: consume statements until "end if found"
    let elseBranch: Statement[];
    if (this.tokenMatch(TokenType.KW_ELSE)) {
      elseBranch = this.parseUntil([TokenType.KW_END_IF], context)
    } else {
      elseBranch = []
    }

    this.consume(TokenType.KW_END_IF, "Expected 'end if' at the end of if block")

    return new IfStatement(ifBranch, elseIfs, elseBranch)
  }

  private singleLineIf(condition: Expression, context: ParsingContext): IfStatement {
    const singleLineThenContext = context.enterSingleLineThen()
    const ifStatement = this.nonBlockStatement(singleLineThenContext)
    const ifBranch = new ConditionedStatements(condition, [ifStatement])

    let elseBranch: Statement[]
    if (this.tokenMatch(TokenType.KW_ELSE)) {
      const statement = this.nonBlockStatement(context)
      elseBranch = [statement]
    } else {
      elseBranch = []
    }

    return new IfStatement(ifBranch, [], elseBranch)
  }

  private whileStatement(context: ParsingContext): Statement {
    const whileToken = this.previous()

    const condition = this.expression(context)

    // Should consume newlines or semicolons
    this.consumeAtLeastOne([TokenType.SEMICOLON, TokenType.NEWLINE], "Expected semicolon or newline after while-condition")

    // Consume statements until "end while" found - but don't consume it yet
    const loopContext = context.enterLoop()
    const whileStatements = this.parseUntil([TokenType.KW_END_WHILE], loopContext)

    // Check for closing "end while"
    this.consume(TokenType.KW_END_WHILE, "Expected 'end while' at the end of while block")

    const headerLocation = whileToken.location.upTo(condition.location());

    return new WhileStatement(condition, headerLocation, whileStatements);
  }

  private forStatement(context: ParsingContext): Statement {
    const forToken = this.previous();

    const loopVar = this.consume(TokenType.IDENTIFIER_TK, "Expected identifier as loop variable") as Identifier

    this.consume(TokenType.OP_IN, "Expected 'in' after loop-variable in for")

    const rangeExpression = this.expression(context)

    // Should consume newlines or semicolons
    this.consumeAtLeastOne([TokenType.SEMICOLON, TokenType.NEWLINE], "Expected semicolon or newline after for-header")

    // Consume statements until "end for" found - but don't consume it yet
    const loopContext = context.enterLoop()
    const forStatements = this.parseUntil([TokenType.KW_END_FOR], loopContext)

    // Check for closing "end for"
    this.consume(TokenType.KW_END_FOR, "Expected 'end for' at the end of while block")

    const headerLocation = forToken.location.upTo(rangeExpression.location());

    return new ForStatement(loopVar, rangeExpression, headerLocation, forStatements);
  }

  private breakStatement(context: ParsingContext): BreakStatement {
    if (context.insideLoop) {
      const fullLocation = this.previous().location;
      return new BreakStatement(fullLocation);
    } else {
      throw this.failParsing("Keyword 'break' only allowed in for / while loops")
    }
  }

  private continueStatement(context: ParsingContext): ContinueStatement {
    if (context.insideLoop) {
      const fullLocation = this.previous().location;
      return new ContinueStatement(fullLocation);
    } else {
      throw this.failParsing("Keyword 'continue' only allowed in for / while loops")
    }
  }

  private returnStatement(context: ParsingContext): ReturnStatement {
    const openingToken = this.previous();
    let fullLocation: SrcLocation;

    if (context.insideFunction) {
      let optReturnValue
      if (this.isAtEndOfStatement(context)) {
        optReturnValue = undefined
        fullLocation = openingToken.location;
      } else {
        optReturnValue = this.expression(context) as Expression;
        fullLocation = openingToken.location.upTo(optReturnValue.location());
      }      
      return new ReturnStatement(optReturnValue, fullLocation);
    } else {
      throw this.failParsing("Keyword 'return' only allowed in function body")
    }
  }

  private expressionStatement(context: ParsingContext): Statement {

    const statementExprContext = context.enterParsingStatementExpr()
    const expr = this.expression(statementExprContext)

    // If next token is not SEMICOLON / NEWLINE / EOF then assume it's a statement call
    if (!this.isAtEndOfStatement(context)) {
      // Parse comma-separated expressions and build a statement call out of this
      let args: Expression[] = []
      do {
        const argumentExp = this.functionBodyOrExpr(context)
        args.push(argumentExp)
      } while(this.tokenMatch(TokenType.COMMA))
      return new FunctionCallStatement(expr, args)
    } else {
      return new ExpressionStatement(expr)
    }
  }

  private isAtEndOfStatement(context: ParsingContext): boolean {
    const nextTokenType = this.peek().tokenType
    if (context.insideSingleLineThen) {
      return [TokenType.KW_ELSE, TokenType.SEMICOLON, TokenType.NEWLINE, TokenType.EOF].includes(nextTokenType)
    } else {
      return [TokenType.SEMICOLON, TokenType.NEWLINE, TokenType.EOF].includes(nextTokenType)
    }
  }

  private assignmentStatement(context: ParsingContext): AssignmentStatement {
    if(this.check(TokenType.OP_FUNCREF)) {
      // If there is an '@' sign before the target, skip it.
      // This allows to write statements like `@target = value`
      // They behave exactly as `target = value`
      this.advance()
    }

    const target: Expression = this.call(context)

    this.consume(TokenType.ASSIGN, "Expected '=' in assignment")

    const value = this.functionBodyOrExpr(context)

    if(target instanceof IdentifierExpr || target instanceof PropertyAccessExpr || target instanceof ListAccessExpr) {
      return new AssignmentStatement(target, value)
    } else {
      throw this.failParsing("Invalid assignment target")
    }
  }

  private expression(context: ParsingContext): Expression {
    return this.logicOr(context)
  }

  private logicOr(context: ParsingContext): Expression {
    let expr = this.logicAnd(context)

    while (this.tokenMatch(TokenType.OP_OR)) {
      const operator = this.previous()
      const right = this.logicAnd(context)
      expr = new LogicExpr(expr, operator, right)
    }

    return expr
  }

  private logicAnd(context: ParsingContext): Expression {
    let expr = this.equalityComparison(context)

    while (this.tokenMatch(TokenType.OP_AND)) {
      const operator = this.previous()
      const right = this.equalityComparison(context)
      expr = new LogicExpr(expr, operator, right)
    }

    return expr
  }

  private equalityComparison(context: ParsingContext): Expression {
    let expr = this.relativeComparison(context)
    while (this.tokenMatch(TokenType.OP_NOT_EQUALS, TokenType.OP_EQUALS)) {
      const operator = this.previous()
      const right = this.relativeComparison(context)
      expr = new BinaryExpr(expr, operator, right)
    }

    return expr
  }

  private relativeComparison(context: ParsingContext): Expression {
    let expr = this.nonEqualityComparison(context)

    while (this.tokenMatch(TokenType.OP_GREATER, TokenType.OP_GREATER_EQUALS, TokenType.OP_LESS, TokenType.OP_LESS_EQUALS)) {
      const operator = this.previous()
      const right = this.nonEqualityComparison(context)
      expr = new BinaryExpr(expr, operator, right)
    }

    return expr
  }

  private nonEqualityComparison(context: ParsingContext): Expression {
    let expr = this.term(context)

    while (this.tokenMatch(TokenType.OP_ISA, TokenType.OP_IN)) {
      const operator = this.previous()
      const right = this.term(context)
      expr = new BinaryExpr(expr, operator, right)
    }

    return expr
  }

  private term(context: ParsingContext): Expression {
    let expr = this.factor(context)

    if (!this.isFollowedByUnaryMinus(context)) {
      while (this.tokenMatch(TokenType.OP_MINUS, TokenType.OP_PLUS)) {
        const operator = this.previous()
        const right = this.factor(context)
        expr = new BinaryExpr(expr, operator, right)
      }
    }

    return expr
  }

  /**
   * Checks if the expression is followed by an unary-minus
   *
   * If at the beginning of statement and expr is a property access or identifier
   * AND next token is OP_MINUS w/afterSpace AND whatever comes after OP_MINUS is not afterSpace,
   * then bypass this: don't try to match term
   */
  private isFollowedByUnaryMinus(context: ParsingContext): boolean {
    let followedByMinus = this.peek().tokenType == TokenType.OP_MINUS

    if (context.parsingStatementExpr && followedByMinus) {
      const hasSpaceBeforeMinus = this.peek().afterSpace
      const peekOne = this.peekAmount(1)
      const hasSpaceAfterMinus = peekOne != null && peekOne.afterSpace
      return hasSpaceBeforeMinus && !hasSpaceAfterMinus
    } else {
      return false
    }
  }

  private factor(context: ParsingContext): Expression {
    var expr = this.power(context)

    while (this.tokenMatch(TokenType.OP_DIV, TokenType.OP_MULT, TokenType.OP_MOD)) {
      const operator = this.previous()
      const right = this.power(context)
      expr = new BinaryExpr(expr, operator, right)
    }

    return expr
  }

  private power(context: ParsingContext): Expression {
    let expr = this.unary(context)

    while (this.tokenMatch(TokenType.OP_POW)) {
      const operator = this.previous()
      const right = this.unary(context)
      expr = new BinaryExpr(expr, operator, right)
    }

    return expr
  }

  private unary(context: ParsingContext): Expression {
    if (this.tokenMatch(TokenType.OP_NOT, TokenType.OP_MINUS, TokenType.KW_NEW)) {
      const operator = this.previous()
      const right = this.call(context)
      // Try to convert a negated number to a literal expression
      if (right instanceof Literal && typeof right.value == "number" && operator.tokenType == TokenType.OP_MINUS) {
        const fullLocation = operator.location.upTo(right.location());
        return new Literal(-right.value, fullLocation);
      } else {
        return new UnaryExpr(operator, right);
      }
    } else if (this.tokenMatch(TokenType.OP_FUNCREF)) {
      return this.functionReference(context)
    } else {
      return this.call(context)
    }
  }

  private functionReference(context: ParsingContext): Expression {
    const openingToken = this.previous();

    const refTarget: Expression = this.call(context)
    if (refTarget instanceof IdentifierExpr 
      || refTarget instanceof PropertyAccessExpr
      || refTarget instanceof ListAccessExpr) {
        const fullLocation = openingToken.location.upTo(refTarget.location());
        return new FunctionRefExpr(refTarget, fullLocation);
    } else {
      throw new ParseError("Invalid reference target for '@': " + refTarget)
    }
  }

  private call(context: ParsingContext): Expression {
    let expr = this.primary(context)
    let continueParsing = true

    while (continueParsing) {
      if (this.matchesNonAfterSpaces(TokenType.OPEN_ROUND)) {
        expr = this.finishCall(expr, context)
      } else if (this.matchesNonAfterSpaces(TokenType.OPEN_SQUARE)) {
        expr = this.listAccessOrSlicing(expr, context)
      } else if (this.matchesNonAfterSpaces(TokenType.DOT)) {
        const propertyName = this.consume(TokenType.IDENTIFIER_TK,
          "Expected property name after '.'") as Identifier
        expr = new PropertyAccessExpr(expr, propertyName)
        // If there is a space after the property name stop parsing
        // We might be in a statement call
        if (this.peek().afterSpace) {
          continueParsing = false
        }
      } else {
        continueParsing = false
      }
    }

    return expr
  }

  private finishCall(callTarget: Expression, context: ParsingContext): Expression {
    let args: Expression[] = []
    
    if (!this.check(TokenType.CLOSE_ROUND)) {
      do {
        const argumentExpression = this.functionBodyOrExpr(context)
        args.push(argumentExpression)
      } while(this.tokenMatch(TokenType.COMMA))
    }
    this.consume(TokenType.CLOSE_ROUND, "Expected closing ')' after function arguments")
    
    const closingToken = this.previous();
    const fullLocation = callTarget.location().upTo(closingToken.location);

    return new FunctionCallExpr(callTarget, args, fullLocation);
  }

  private functionBodyOrExpr(context: ParsingContext): Expression {
    if (this.tokenMatch(TokenType.KW_FUNCTION)) {
      return this.functionBody(context)
    } else {
      return this.expression(context)
    }
  }

  private listAccessOrSlicing(listTarget: Expression, context: ParsingContext): Expression {
    const openingToken = this.previous();

    let slicing = false

    let startExpr: Expression | undefined = undefined
    let stopExpr: Expression | undefined = undefined
    let indexExpr: Expression | undefined = undefined

    if(this.tokenMatch(TokenType.COLON)) {
      // Slicing with no start
      slicing = true
      // Check for ']', if not, parse stopExpr
      if(!this.check(TokenType.CLOSE_SQUARE)) {
        stopExpr = this.expression(context)
      }
    } else {
      // Parse one expression, and see what happens afterwards
      const expr = this.expression(context)
      if(this.tokenMatch(TokenType.COLON)) {
        // We are slicing and the expression was the start expression
        slicing = true
        startExpr = expr
        // Now we can try to parse the (optional) stop expression
        if(!this.check(TokenType.CLOSE_SQUARE)) {
          stopExpr = this.expression(context)
        }
      } else {
        // Not slicing, what we got was THE index expression
        indexExpr = expr
      }
    }

    this.consume(TokenType.CLOSE_SQUARE, "Expected closing ']' for list access. Found: " + this.peek().tokenType)

    const closingToken = this.previous();
    const fullRange = SrcLocation.forTokenRange(openingToken, closingToken);

    if (slicing) {
      return new ListSlicingExpr(listTarget, startExpr, stopExpr, fullRange);
    } else {
      return new ListAccessExpr(listTarget, indexExpr as Expression, fullRange);
    }
  }

  private primary(context: ParsingContext): Expression {
    if (this.tokenMatch(TokenType.KW_FALSE)) {
      return new Literal(false, this.previous().location);
    } else if (this.tokenMatch(TokenType.KW_TRUE)) {
      return new Literal(true, this.previous().location);
    } else if (this.tokenMatch(TokenType.KW_NULL)) {
      return new Literal(null, this.previous().location);
    } else if (this.tokenMatch(TokenType.KW_SELF)) {
      return this.selfExpr(context)
    } else if (this.tokenMatch(TokenType.KW_SUPER)) {
      return this.superExpr(context)
    } else if (this.tokenMatch(TokenType.INT_LITERAL, TokenType.FLOAT_LITERAL, TokenType.STRING_LITERAL)) {
      const token = this.previous() as LiteralToken<any>
      return new Literal(token.value, token.location);
    } else if (this.check(TokenType.IDENTIFIER_TK)) {
      return this.identifier();
    } else if (this.tokenMatch(TokenType.OPEN_ROUND)) {
      return this.groupingExpr(context);
    } else if (this.tokenMatch(TokenType.OPEN_SQUARE)) {
      return this.listLiteral(context)
    } else if (this.tokenMatch(TokenType.OPEN_CURLY)) {
      return this.mapLiteral(context)
    } else {
      throw this.failParsing("Expected expression. Found: " + this.peek().tokenType)
    }
  }

  private groupingExpr(context: ParsingContext): GroupingExpr {
    const openingToken = this.previous();
    const expr = this.expression(context);
    this.consume(TokenType.CLOSE_ROUND, "Expected ')' after expression.")
    const closingToken = this.previous();
    const fullLocation = SrcLocation.forTokenRange(openingToken, closingToken);
    return new GroupingExpr(expr, fullLocation);
  }

  private identifier(): IdentifierExpr {
    const token = this.consume(TokenType.IDENTIFIER_TK, "Identifier expected") as Identifier
    return new IdentifierExpr(token)
  }

  private selfExpr(context: ParsingContext): SelfExpr {
    if (context.insideFunction) {
      const token = this.previous()
      return new SelfExpr(token.location)
    } else {
      throw this.failParsing("Keyword 'self' only allowed inside a function")
    }
  }

  private superExpr(context: ParsingContext): SuperExpr {
    if (context.insideFunction) {
      const token = this.previous()
      return new SuperExpr(token.location)
    } else {
      throw this.failParsing("Keyword 'super' only allowed inside a function")
    }
  }

  private listLiteral(context: ParsingContext): ListExpr {
    const openingToken = this.previous()
    let elements: Expression[] = []
    if (!this.check(TokenType.CLOSE_SQUARE)) {
      var continueParsing = true
      do {
        // Support trailing commas inside list literal
        if(this.previous().tokenType == TokenType.COMMA && this.check(TokenType.CLOSE_SQUARE)) {
          // We just parsed a comma, and now comes a closing square - we are done
          continueParsing = false
        } else {
          // Parse an expression inside the list, as usual
          const argumentExpression = this.expression(context)
          elements.push(argumentExpression)
        }
      } while(this.tokenMatch(TokenType.COMMA) && continueParsing)
    }
    this.consume(TokenType.CLOSE_SQUARE, "Expected closing ']' in list literal")
    
    const closingToken = this.previous()
    const fullLocation = SrcLocation.forTokenRange(openingToken, closingToken);
    
    return new ListExpr(elements, fullLocation);
  }

  private mapLiteral(context: ParsingContext): MapExpr {
    const openingToken = this.previous();
    let elements = new Map<Expression, Expression>()
    if (!this.check(TokenType.CLOSE_CURLY)) {
      var continueParsing = true
      do {
        // Support trailing commas inside list literal
        if(this.previous().tokenType == TokenType.COMMA && this.check(TokenType.CLOSE_CURLY)) {
          // We just parsed a comma, and now comes a closing curly - we are done
          continueParsing = false
        } else {
          // Parse an expression inside the map, as usual
          const key = this.expression(context)
          this.consume(TokenType.COLON, "Expected ':' after key. Found: " + this.peek().tokenType)
          const value = this.expression(context)
          elements.set(key, value)
        }
      } while(this.tokenMatch(TokenType.COMMA) && continueParsing)
    }
    this.consume(TokenType.CLOSE_CURLY, "Expected closing '}' in map literal")

    const closingToken = this.previous()
    const fullLocation = SrcLocation.forTokenRange(openingToken, closingToken);

    return new MapExpr(elements, fullLocation);
  }

  private functionBody(context: ParsingContext): FunctionBodyExpr {
    const openingToken = this.previous();
    const functionContext = context.enterFunction()

    // Parse arguments
    let args: Argument[] = []
    if (this.tokenMatch(TokenType.OPEN_ROUND)) {
      do {
        if (this.check(TokenType.IDENTIFIER_TK)) {
          const identifierExpr = this.identifier()
          const name = identifierExpr.identifier.value
          let fullLocation: SrcLocation;
          let defaultValue: Expression | undefined;
          if (this.tokenMatch(TokenType.ASSIGN)) {
            defaultValue = this.unary(context) as Expression;
            fullLocation = identifierExpr.location().upTo(defaultValue.location());
          } else {
            defaultValue = undefined;
            fullLocation = identifierExpr.location();
          }
      
          // TODO: check that default value is not too complex?
          //  Should be literal
          const argument = new Argument(name, defaultValue, fullLocation)
          args.push(argument)
        }
      } while (this.tokenMatch(TokenType.COMMA))
      this.consume(TokenType.CLOSE_ROUND, "Expected closing ')' after argument list")
    }
    // Parse statements
    const bodyStatements = this.parseUntil([TokenType.KW_END_FUNCTION], functionContext)
    this.consume(TokenType.KW_END_FUNCTION, "Expected 'end function' at the end of function-body")

    const closingToken = this.previous()
    const fullLocation = SrcLocation.forTokenRange(openingToken, closingToken);

    return new FunctionBodyExpr(args, bodyStatements, fullLocation)
  }

  private consume(tokenType: TokenType, message: String): Token {
    if (this.check(tokenType)) {
      return this.advance()
    } else {
      throw this.failParsing(message)
    }
  }

  /**
   * Tries to consume as many of the token-types as possible, at least one
   * */
  private consumeAtLeastOne(tokenTypes: TokenType[], message: string) {

    let shouldConsume = true
    let tokensConsumed = 0

    while (!this.isAtEnd() && shouldConsume) {
      let matchFound = false
      for (let tokenType of tokenTypes) {
        if (this.check(tokenType)) {
          matchFound = true
          tokensConsumed += 1
          this.advance()
        }
      }
      if (!matchFound) {
        // Found a token that does not match the expected token-types, stop looping
        shouldConsume = false
      }
    }

    if (tokensConsumed == 0) {
      throw new ParseError(message)
    }
  }

  private failParsing(message: String): Error {
    const pos = this.peek().location.start;
    return new ParseError(`At line ${pos.row}, column ${pos.col}: $message`)
  }

  private tokenMatch(...types: TokenType[]): boolean {
    for (let tokenType of types) {
      if (this.check(tokenType)) {
        this.advance()
        return true
      }
    }
    return false
  }

  private matchesNonAfterSpaces(tokenType: TokenType): boolean {
    const token = this.peek()
    if (token.tokenType == tokenType && !token.afterSpace) {
      this.advance()
      return true
    } else {
      return false
    }
  }

  /**
   * Checks tokens until the next newline / semicolon / EOF.
   * That is: within a statement boundary
   *
   * Useful for "guessing" statements
   * */
  private tokensInStatementBoundaryMatch(tokenType: TokenType): boolean {
    let idx = this.current
    let shouldSeek = true
    let matchFound = false
    while (shouldSeek) {
      const token = this.tokens[idx]
      if ([TokenType.EOF, TokenType.SEMICOLON, TokenType.NEWLINE].includes(token.tokenType)) {
        // Statement boundary reached
        shouldSeek = false
      } else if (token.tokenType == tokenType) {
        // Match found
        matchFound = true
        shouldSeek = false
      }
      idx += 1
    }

    return matchFound
  }

  private check(tokenType: TokenType): boolean {
    if (this.current > this.tokens.length) {
      return false
    } else {
      return this.peek().tokenType == tokenType
    }
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.current += 1
    }
    return this.previous()
  }

  private isAtEnd(): boolean {
    return this.peek().tokenType == TokenType.EOF
  }

  private peek(): Token {
    return this.tokens[this.current]
  }

  private peekAmount(amount: number): Token | null {
    const idx = this.current + amount
    if (idx < this.tokens.length) {
      return this.tokens[idx]
    } else {
      return null
    }
  }

  private previous(): Token {
    return this.tokens[this.current - 1]
  }

}