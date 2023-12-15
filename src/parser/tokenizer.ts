
// Used internally by the tokenizer
class NumberLiteral {
  
  public readonly isInt: boolean
  public readonly numberValue: number

  constructor(isInt: boolean, numberValue: number) {
    this.isInt = isInt
    this.numberValue = numberValue
  }
}

class Tokenizer {

  private readonly input: string;
  private readonly source: string | undefined;
  private pos: Pos;
  private startPos: Pos;
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
    "super": TokenType.KW_SUPER,
    "true": TokenType.KW_TRUE,
    "false": TokenType.KW_FALSE,
    "null": TokenType.KW_NULL,
    "in": TokenType.KW_IN,
    "not": TokenType.OP_NOT,
    "or": TokenType.OP_OR,
    "and": TokenType.OP_AND,
    "isa": TokenType.OP_ISA,
    "new": TokenType.KW_NEW,
  }

  constructor(input: string, source: string | undefined = undefined) {
    this.input = input;
    this.pos = new Pos(0, 1, 1);
    this.startPos = this.pos.copy();
    this.source = source;
  }

  tokenize(): Token[] {
    this.updateCharAndPeek()

    while (this.hasInput()) {
      this.processNextToken()
    }
    this.addEofToken(this.location())

    const tokensCombined = this.combinedTokens(this.tokens)

    return tokensCombined
  }

  private idx(): number {
    return this.pos.idx;
  }

  private saveStartPos() {
    this.startPos = this.pos.copy();
  }

  private location(): SrcLocation {
    const endPos = this.pos.copy();
    const loc = new SrcLocation(this.startPos, endPos, this.source);
    return loc;
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
      throw new ParserError(`got Unknown(${ch}) where EOL is required`, this.pos)
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
    let i = 0;
    while (i < amount) {
      this.pos.advance();
      i += 1;
    }

    if (this.hasInput()) {
      this.updateCharAndPeek()
    }
  }

  private addToken(newToken: Token) {
    this.tokens.push(newToken);
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
      throw new ParserError("Expected newline character", this.pos)
    }
    this.addSimpleToken(TokenType.NEWLINE)
    this.pos.moveToNewLine()
  }

  private processSymbol() {
    this.saveStartPos();
    const symbolValue: string = this.fetchSymbol()
    if (symbolValue in this.keywordTable) {
      const tokenType = this.keywordTable[symbolValue]
      this.addSimpleToken(tokenType)
    } else {
      this.addIdentifierToken(symbolValue)
    }
  }

  private processOperator() {
    this.saveStartPos();

    const peek1 = this.getChar()
    const peek2 = this.peek2Chars()
    let charsToAdvance = 0;
    let tokenTypeToAdd: TokenType | null = null;

    // Try to handle 2-char operators first
    switch(peek2) {
      case "==":
        charsToAdvance = 2;
        tokenTypeToAdd = TokenType.OP_EQUALS;
        break;
      case "!=":
        charsToAdvance = 2;
        tokenTypeToAdd = TokenType.OP_NOT_EQUALS;
        break;
      case "<=":
        charsToAdvance = 2;
        tokenTypeToAdd = TokenType.OP_LESS_EQUALS;
        break;
      case ">=":
        charsToAdvance = 2;
        tokenTypeToAdd = TokenType.OP_GREATER_EQUALS;
        break;
      case "+=":
        // Not really an operator, but handled here
        charsToAdvance = 2;
        tokenTypeToAdd = TokenType.PLUS_ASSIGN;
        break;
      case "-=":
        // Not really an operator, but handled here
        charsToAdvance = 2;
        tokenTypeToAdd = TokenType.MINUS_ASSIGN;
        break; 
      case "*=":
        // Not really an operator, but handled here
        charsToAdvance = 2;
        tokenTypeToAdd = TokenType.MULT_ASSIGN;
        break;
      case "/=":
        // Not really an operator, but handled here
        charsToAdvance = 2;
        tokenTypeToAdd = TokenType.DIV_ASSIGN;
        break; 
      case "%=":
        // Not really an operator, but handled here
        charsToAdvance = 2;
        tokenTypeToAdd = TokenType.MOD_ASSIGN;
        break;
      case "^=":
        // Not really an operator, but handled here
        charsToAdvance = 2;
        tokenTypeToAdd = TokenType.POW_ASSIGN;
        break; 
      default:
        // Nothing, we'll try with one-char below
        break;
    }

    // If nothing matched with 2 chars, try with one
    if (tokenTypeToAdd === null) {
      switch(peek1) {
        case '=':
          // Not really an operator, but handled here
          charsToAdvance = 1;
          tokenTypeToAdd = TokenType.ASSIGN;
          break;
        case '<':
          charsToAdvance = 1;
          tokenTypeToAdd = TokenType.OP_LESS;
          break;
        case '>':
          charsToAdvance = 1;
          tokenTypeToAdd = TokenType.OP_GREATER;
          break;
        case '+':
          charsToAdvance = 1;
          tokenTypeToAdd = TokenType.OP_PLUS;
          break;
        case '-':
          charsToAdvance = 1;
          tokenTypeToAdd = TokenType.OP_MINUS;
          break;
        case '*':
          charsToAdvance = 1;
          tokenTypeToAdd = TokenType.OP_MULT;
          break;
        case '/':
          charsToAdvance = 1;
          tokenTypeToAdd = TokenType.OP_DIV;
          break;
        case '%':
          charsToAdvance = 1;
          tokenTypeToAdd = TokenType.OP_MOD;
          break;
        case '^':
          charsToAdvance = 1;
          tokenTypeToAdd = TokenType.OP_POW;
          break;
        case '@':
          charsToAdvance = 1;
          tokenTypeToAdd = TokenType.OP_FUNCREF;
          break;
        default:
          throw new ParserError("Unhandled operator: " + peek1, this.startPos)
      }
    }

    if (tokenTypeToAdd != null) {
      this.addSimpleToken(tokenTypeToAdd);
      this.advance(charsToAdvance);
    }
  }

  private processStringLiteral() {
    this.saveStartPos();
    const value = this.fetchStringLiteral()
    this.addStringLiteralToken(value, this.location())
  }

  private fetchStringLiteral() {
    let chars = ""
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
      throw new ParserError("Unterminated string literal", this.startPos)
    }

    return chars
  }

  /**
   * Could be a dot for accessing a property, but could also be part of a float literal.
   *
   * It is part of a float literal if followed by a number
   * */
  private processDot() {
    this.saveStartPos();
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
    this.saveStartPos();
    const value = this.fetchNumberLiteral()
    if (value.isInt) {
      this.addIntLiteralToken(value.numberValue, this.location())
    } else {
      this.addFloatLiteralToken(value.numberValue, this.location())
    }
  }

  private fetchNumberLiteral(): NumberLiteral {
    let consumingFloatingPart = false
    let intDigits = ""
    let floatDigits = ""
    let fetchingChars = true
    let exponentPart = ""

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
          throw new ParserError("Unexpected repeated dot", this.startPos)
        }
        consumingFloatingPart = true
        this.advance()
      } else if (ch == 'e' || ch == 'E') {
        exponentPart = this.parseExponentPart();
        fetchingChars = false
      } else {
        fetchingChars = false
      }
    }

    let numberValue: number;
    let isInt: boolean; 

    if (floatDigits.length > 0) {
      numberValue = parseFloat(`${intDigits}.${floatDigits}${exponentPart}`);
      isInt = false;
    } else {
      numberValue = parseInt(`${intDigits}${exponentPart}`);
      isInt = true;
    }

    return new NumberLiteral(isInt, numberValue);
  }

  private parseExponentPart(): string {
    const eChar = this.getChar();
    this.advance();

    const signChar = this.consumeAny("+", "-");
    if (!signChar) {
      throw new Error("Expected +/- after exponential letter");
    }

    let exponentPart: string = "";
    
    while (this.hasInput()) {
      const optDigit = this.consumeAny('0','1','2','3','4','5','6','7','8','9');
      if (optDigit !== undefined) {
        exponentPart += optDigit;
      } else {
        break;
      }
    }

    if (exponentPart.length == 0) {
      throw new Error("Expected exponent in exponential notation");
    }
    
    return `${eChar}${signChar}${exponentPart}`;
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

  private consumeAny(...chars: string[]): string|undefined {
    const c = this.getChar();
    for (let i = 0; i < chars.length; i++) {
      if (chars[i] === c) {
        this.advance();
        return c;
      }
    }
    // No match found
    return undefined;
  }

  private addSimpleToken(tokenType: TokenType) {
    const afterSpace = this.processAfterSpaces()
    const newToken: Token = new SimpleToken(
      tokenType,
      this.location(),
      afterSpace)
    this.addToken(newToken)
  }

  private addIdentifierToken(identifierValue: string) {
    const afterSpace = this.processAfterSpaces()
    const newToken = new Identifier(
      identifierValue,
      this.location(),
      afterSpace)
    this.addToken(newToken)
  }

  private addStringLiteralToken(stringValue: string, tokenLocation: SrcLocation) {
    const afterSpace = this.processAfterSpaces()
    const newToken = new StringLiteral(
      stringValue,
      tokenLocation,
      afterSpace)
    this.addToken(newToken)
  }

  private addIntLiteralToken(intValue: number, tokenLocation: SrcLocation) {
    const afterSpace = this.processAfterSpaces()
    const newToken = new IntLiteral(
      intValue,
      tokenLocation,
      afterSpace)
    this.addToken(newToken)
  }

  private addFloatLiteralToken(floatValue: number, tokenLocation: SrcLocation) {
    const afterSpace = this.processAfterSpaces()
    const newToken = new FloatLiteral(
      floatValue,
      tokenLocation,
      afterSpace)
    this.addToken(newToken)
  }

  private addEofToken(tokenLocation: SrcLocation) {
    const afterSpace = this.processAfterSpaces()
    const newToken = new EofToken(
      tokenLocation,
      afterSpace)
    this.addToken(newToken)
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
    this.saveStartPos();
    this.advance();
    this.addSimpleToken(tokenType)
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
            const newLocation = token.location.upTo(optNextToken.location);
            tokenToAdd = new SimpleToken(TokenType.KW_END_IF, newLocation, token.afterSpace)
            secondTokenFound = true
          } else if (optNextToken.tokenType == TokenType.KW_WHILE) {
            const newLocation = token.location.upTo(optNextToken.location);
            tokenToAdd = new SimpleToken(TokenType.KW_END_WHILE, newLocation, token.afterSpace)
            secondTokenFound = true
          } else if (optNextToken.tokenType == TokenType.KW_FOR) {
            const newLocation = token.location.upTo(optNextToken.location);
            tokenToAdd = new SimpleToken(TokenType.KW_END_FOR, newLocation, token.afterSpace)
            secondTokenFound = true
          } else if (optNextToken.tokenType == TokenType.KW_FUNCTION) {
            const newLocation = token.location.upTo(optNextToken.location);
            tokenToAdd = new SimpleToken(TokenType.KW_END_FUNCTION, newLocation, token.afterSpace)
            secondTokenFound = true
          }
        }
        if (!secondTokenFound) {
          throw new ParserError("Expected token of type if / for / while / function after 'end", token.location.start);
        }
      // Combine "ELSE" + "IF" to "ELSE IF"
      } else if (token.tokenType == TokenType.KW_ELSE) {
        if (optNextToken != null && optNextToken instanceof SimpleToken) {
          if (optNextToken.tokenType == TokenType.KW_IF) {
            const newLocation = token.location.upTo(optNextToken.location);
            tokenToAdd = new SimpleToken(TokenType.KW_ELSE_IF, newLocation, token.afterSpace)
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

