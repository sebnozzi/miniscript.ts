
// Used internally by the tokenizer
class NumberLiteral {
  
  isInt: boolean
  numberValue: number

  constructor(isInt: boolean, numberValue: number) {
    this.isInt = isInt
    this.numberValue = numberValue
  }
}

class Tokenizer {

  private readonly input: string;
  private pos: Pos = new Pos(0, 1, 1)
  private _currentChar: string = '\u0000'
  private _peek2Str: string = ""
  private _lastTokenIsSpace: boolean = false

  private tokens: Token[] = []

  private readonly keywordTable: { [id:string]: TokenType } = {
    "if": TokenType.KW_IF,
    "else": TokenType.KW_ELSE,
    "then": TokenType.KW_THEN,
    "while": TokenType.KW_WHILE,
    "for": TokenType.KW_FOR,
    "function": TokenType.KW_FUNCTION,
    "break": TokenType.KW_BREAK,
    "continue": TokenType.KW_CONTINUE,
    "end": TokenType.KW_END,
    "return": TokenType.KW_RETURN,
    "self": TokenType.KW_SELF,
    "super": TokenType.KW_SUPER,
    "true": TokenType.KW_TRUE,
    "false": TokenType.KW_FALSE,
    "null": TokenType.KW_NULL,
    "in": TokenType.OP_IN,
    "not": TokenType.OP_NOT,
    "or": TokenType.OP_OR,
    "and": TokenType.OP_AND,
    "isa": TokenType.OP_ISA,
    "new": TokenType.KW_NEW,
  }

  constructor(input: string) {
    this.input = input;
    this.pos = new Pos(0, 1, 1);
  }

  tokenize(): Token[] {
    this.updateCharAndPeek()

    while (this.hasInput()) {
      this.processNextToken()
    }
    this.addEofToken(this.pos)

    const tokensCombined = this.combinedTokens(this.tokens)

    return tokensCombined
  }

  private idx(): number {
    return this.pos.idx;
  }

  private hasInput(): boolean {
    return this.idx() < this.input.length
  }

  private processNextToken()  {
    const ch: string = this.getChar()

    if (this.isSpaceChar(ch)) {
      this.processSpaces()
    } else if(ch == '\n' || ch =='\r') {
      this.processNewline()
    } else if(ch == '\"') {
      this.processStringLiteral()
    } else if(this.isNumericChar(ch)) {
      // This could be int or float - it's decided later
      this.processNumberLiteral()
    } else if (ch == ';') {
      this.processCharToken(TokenType.SEMICOLON)
    } else if (ch == ':') {
      this.processCharToken(TokenType.COLON)
    } else if (ch == '.') {
      this.processDot()
    } else if(ch == ',') {
      this.processCharToken(TokenType.COMMA)
    } else if(ch == '(') {
      this.processCharToken(TokenType.OPEN_ROUND)
    } else if(ch == ')') {
      this.processCharToken(TokenType.CLOSE_ROUND)
    } else if(ch == '[') {
      this.processCharToken(TokenType.OPEN_SQUARE)
    } else if(ch == ']') {
      this.processCharToken(TokenType.CLOSE_SQUARE)
    } else if(ch == '{') {
      this.processCharToken(TokenType.OPEN_CURLY)
    } else if(ch == '}') {
      this.processCharToken(TokenType.CLOSE_CURLY)
    } else if(this.peek2Chars() == "//") {
      this.processComment()
    } else if(this.isOperatorChar(ch)) {
      this.processOperator()
    } else if(this.isIdentifierStartChar(ch)) {
      this.processSymbol()
    } else {
      throw new ParseError("Unhandled token: " + ch + " at " + this.pos)
    }
  }

  private getChar(): string {
    return this._currentChar
  }

  /**
   * Tries to peek N-amount of characters, cutting before if not possible
   * */
  private peek2Chars(): string {
    return this._peek2Str
  }

  private advance(amount: number = 1) {
    let i = 0
    while (i < amount) {
      this.pos.advance()
      i += 1
    }

    if (this.hasInput()) {
      this.updateCharAndPeek()
    }
  }

  private updateCharAndPeek() {
    // Update chars / peek
    this._currentChar = this.input[this.idx()]
    if (this.idx() + 1 < this.input.length) {
      const afterCurrent = this.input[this.idx() + 1]
      this._peek2Str = `${this._currentChar}${afterCurrent}`
    } else {
      this._peek2Str = `${this._currentChar}`
    }
  }

  private processAfterSpaces(): boolean {
    const afterSpaces = this._lastTokenIsSpace
    this._lastTokenIsSpace = false
    return afterSpaces
  }

  private isSpaceChar(ch: string): boolean {
    return ch == ' ' || ch == '\t'
  }

  private isIdentifierStartChar(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') ||
      (ch >= 'A' && ch <= 'Z') ||
      (ch == '_') ||
      // Support unicode
      (ch > '\u009F')
  }

  private isIdentifierChar(ch: string): boolean {
    return (ch >= 'a' && ch <= 'z') ||
      (ch >= 'A' && ch <= 'Z') ||
      (ch >= '0' && ch <= '9') ||
      (ch == '_') ||
      // Support unicode
      (ch > '\u009F')
  }

  private isOperatorChar(ch: string): boolean {
    return ch == '=' ||
      ch == '!' ||
      ch == '@' ||
      ch == '^' ||
      ch == '<' ||
      ch == '>' ||
      ch == '/' ||
      ch == '*' ||
      ch == '%' ||
      ch == '+' ||
      ch == '-'
  }

  private isNumericChar(ch: string): boolean {
    return ch >= '0' && ch <= '9'
  }

  private processSpaces() {
    const spaces = this.consumeChars(this.isSpaceChar)
    if (spaces.length > 0) {
      this._lastTokenIsSpace = true
    }
  }

  private processNewline() {
    const peek2 = this.peek2Chars()
    const ch = this.getChar()
    if (peek2 == "\n\r" || peek2 == "\r\n") {
      this.advance(2)
    } else if (ch == '\n' || ch == '\r') {
      this.advance()
    } else {
      throw new ParseError("Expected newline character at: " + this.pos)
    }
    this.addSimpleToken(TokenType.NEWLINE)
    this.pos.moveToNewLine()
  }

  private processSymbol() {
    const symbolValue: string = this.fetchSymbol()
    if (symbolValue in this.keywordTable) {
      const tokenType = this.keywordTable[symbolValue]
      this.addSimpleToken(tokenType)
    } else {
      this.addIdentifierToken(symbolValue)
    }
  }

  private processOperator() {
    const startPos = this.pos
    const peek1 = this.getChar()
    const peek2 = this.peek2Chars()
    let charsToAdvance = 0

    // Try to handle 2-char operators first
    switch(peek2) {
      case "==":
        charsToAdvance = 2
        this.addSimpleToken(TokenType.OP_EQUALS)
        break;
      case "!=":
        charsToAdvance = 2
        this.addSimpleToken(TokenType.OP_NOT_EQUALS)
        break;
      case "<=":
        charsToAdvance = 2
        this.addSimpleToken(TokenType.OP_LESS_EQUALS)
        break;
      case ">=":
        charsToAdvance = 2
        this.addSimpleToken(TokenType.OP_GREATER_EQUALS)
        break;
      default:
        // Nothing, we'll try with one-char below
        break;
    }

    // If nothing matched with 2 chars, try with one
    if (charsToAdvance == 0) {
      switch(peek1) {
        case '=':
          // Not really an operator, but handled here
          charsToAdvance = 1
          this.addSimpleToken(TokenType.ASSIGN)
          break;
        case '<':
          charsToAdvance = 1
          this.addSimpleToken(TokenType.OP_LESS)
          break;
        case '>':
          charsToAdvance = 1
          this.addSimpleToken(TokenType.OP_GREATER)
          break;
        case '+':
          charsToAdvance = 1
          this.addSimpleToken(TokenType.OP_PLUS)
          break;
        case '-':
          charsToAdvance = 1
          this.addSimpleToken(TokenType.OP_MINUS)
          break;
        case '*':
          charsToAdvance = 1
          this.addSimpleToken(TokenType.OP_MULT)
          break;
        case '/':
          charsToAdvance = 1
          this.addSimpleToken(TokenType.OP_DIV)
          break;
        case '%':
          charsToAdvance = 1
          this.addSimpleToken(TokenType.OP_MOD)
          break;
        case '^':
          charsToAdvance = 1
          this.addSimpleToken(TokenType.OP_POW)
          break;
        case '@':
          charsToAdvance = 1
          this.addSimpleToken(TokenType.OP_FUNCREF)
          break;
        default:
          throw new ParseError("Unhandled operator: " + peek1 + " at " + startPos)
      }
    }

    this.advance(charsToAdvance)
  }

  private processStringLiteral() {
    const startPos = this.pos
    const value = this.fetchStringLiteral()
    this.addStringLiteralToken(value, startPos)
  }

  private fetchStringLiteral() {
    let chars = ""
    const startPos = this.pos
    let closed = false

    // Skip opening quote
    this.advance()

    // Process until a new, lone double-quote char is found
    // Pairs of double-quote chars (i.e. "") are escaped double-quotes (i.e. \")
    while (this.hasInput() && !closed) {
      const peek2 = this.peek2Chars()
      const ch = this.getChar()
      if (peek2 == "\"\"") {
        chars += '\"'
        this.advance(2)
      } else if (ch == '\"') {
        closed = true
        this.advance()
      } else {
        chars += ch
        this.advance()
      }
    }

    if (!closed) {
      throw new ParseError("Unterminated string literal at " + startPos)
    }

    return chars
  }

  /**
   * Could be a dot for accessing a property, but could also be part of a float literal.
   *
   * It is part of a float literal if followed by a number
   * */
  private processDot() {
    const nextChars = this.peek2Chars()
    
    if (nextChars.length > 1 && this.isNumericChar(nextChars[1])) {
      this.processNumberLiteral()
    } else {
      this.processCharToken(TokenType.DOT)
    }
  }

  /**
   * Consume numeric chars until a dot or a non-numeric char is found.
   * If dot found, consume until non-numeric char is found.
   */
  private processNumberLiteral() {
    const startPos = this.pos
    const value = this.fetchNumberLiteral()
    if (value.isInt) {
      this.addIntLiteralToken(value.numberValue, startPos)
    } else {
      this.addFloatLiteralToken(value.numberValue, startPos)
    }
  }

  private fetchNumberLiteral(): NumberLiteral {
    const startPos = this.pos

    let consumingFloatingPart = false
    let intDigits = ""
    let floatDigits = ""
    var fetchingChars = true

    while (this.hasInput() && fetchingChars) {
      const ch = this.getChar()
      if (this.isNumericChar(ch)) {
        if (consumingFloatingPart) {
          floatDigits += ch
          this.advance()
        } else {
          intDigits += ch
          this.advance()
        }
      } else if (ch == '.') {
        if (consumingFloatingPart) {
          throw new ParseError("Unexpected repeated dot found: " + startPos)
        }
        consumingFloatingPart = true
        this.advance()
      } else {
        fetchingChars = false
      }
    }

    const strValue = intDigits

    if (consumingFloatingPart) {
      const strValueWithFloatPart = strValue + "." + floatDigits
      return new NumberLiteral(false, parseFloat(strValueWithFloatPart))
    } else {
      return new NumberLiteral(true, parseInt(strValue))
    }
  }

  /**
   * Advance until newline found
   */
  private processComment() {
    let insideComment = true
    while (this.hasInput() && insideComment) {
      const ch = this.getChar()
      const peek2 = this.peek2Chars()
      if (peek2 == "\n\r" || peek2 == "\r\n") {
        insideComment = false
      } else if (ch == '\n' || ch == '\r') {
        insideComment = false
      } else {
        // Inside comment, advance one char
        this.advance()
      }
    }
  }

  private addSimpleToken(tokenType: TokenType) {
    const afterSpace = this.processAfterSpaces()
    const newToken: Token = new SimpleToken(
      tokenType,
      this.pos,
      afterSpace)
    this.tokens.push(newToken)
  }

  private addIdentifierToken(identifierValue: string) {
    const afterSpace = this.processAfterSpaces()
    const newToken = new Identifier(
      identifierValue,
      this.pos,
      afterSpace)
    this.tokens.push(newToken)
  }

  private addStringLiteralToken(stringValue: string, tokenPosition: Pos) {
    const afterSpace = this.processAfterSpaces()
    const newToken = new StringLiteral(
      stringValue,
      tokenPosition,
      afterSpace)
    this.tokens.push(newToken)
  }

  private addIntLiteralToken(intValue: number, tokenPosition: Pos) {
    const afterSpace = this.processAfterSpaces()
    const newToken = new IntLiteral(
      intValue,
      tokenPosition,
      afterSpace)
    this.tokens.push(newToken)
  }

  private addFloatLiteralToken(floatValue: number, tokenPosition: Pos) {
    const afterSpace = this.processAfterSpaces()
    const newToken = new FloatLiteral(
      floatValue,
      tokenPosition,
      afterSpace)
    this.tokens.push(newToken)
  }

  private addEofToken(tokenPosition: Pos) {
    const afterSpace = this.processAfterSpaces()
    const newToken = new EofToken(
      tokenPosition,
      afterSpace)
    this.tokens.push(newToken)
  }

  private fetchSymbol(): string {
    const predicate = (ch: string) => this.isIdentifierChar(ch);
    const value = this.consumeChars(predicate)
    return value
  }

  /**
   * Consume chars as long as the predicate is true
   */
  private consumeChars(predicate : Function): string {
    let chars = ""
    let fetchingChars = true
    while(this.hasInput() && fetchingChars) {
      const ch = this.getChar()
      if(predicate(ch)) {
        // Put into buffer
        chars += ch
        this.advance()
      } else {
        fetchingChars = false
      }
    }
    return chars
  }

  private processCharToken(tokenType: TokenType) {
    this.addSimpleToken(tokenType)
    this.advance()
  }

  private combinedTokens(tokens: Token[]): Token[] {
    let combinedTokens: Token[] = []

    let idx = 0
    while (idx < tokens.length) {

      const token = tokens[idx]
      let optNextToken: Token | null;

      if (idx + 1 < tokens.length) {
        optNextToken = tokens[idx + 1]
      } else {
        optNextToken = null
      }

      let tokenToAdd: Token = token

      if (token.tokenType == TokenType.KW_END) {
        let secondTokenFound: boolean = false
        if (optNextToken != null) {
          if (optNextToken.tokenType == TokenType.KW_IF) {
            tokenToAdd = new SimpleToken(TokenType.KW_END_IF, token.position, token.afterSpace)
            secondTokenFound = true
          } else if (optNextToken.tokenType == TokenType.KW_WHILE) {
            tokenToAdd = new SimpleToken(TokenType.KW_END_WHILE, token.position, token.afterSpace)
            secondTokenFound = true
          } else if (optNextToken.tokenType == TokenType.KW_FOR) {
            tokenToAdd = new SimpleToken(TokenType.KW_END_FOR, token.position, token.afterSpace)
            secondTokenFound = true
          } else if (optNextToken.tokenType == TokenType.KW_FUNCTION) {
            tokenToAdd = new SimpleToken(TokenType.KW_END_FUNCTION, token.position, token.afterSpace)
            secondTokenFound = true
          }
        }
        if (!secondTokenFound) {
          throw new ParseError("Expected token of type if / for / while / function after 'end")
        }
      } else if (token.tokenType == TokenType.KW_ELSE) {
        if (optNextToken != null && optNextToken instanceof SimpleToken) {
          if (optNextToken.tokenType == TokenType.KW_IF) {
            tokenToAdd = new SimpleToken(TokenType.KW_ELSE_IF, token.position, token.afterSpace)
          }
        }
      }

      if (tokenToAdd != token) {
        idx += 2
      } else {
        idx += 1
      }

      combinedTokens.push(tokenToAdd)
    }

    return combinedTokens
  }

} // Tokenizer

