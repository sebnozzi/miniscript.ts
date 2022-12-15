class Pos {

  idx: number;
  col: number;
  row: number;

  constructor(idx: number, col: number, row: number) {
    this.idx = idx;
    this.col = col;
    this.row = row;
  }

  advance() {
    this.idx=this.idx + 1
    this.col=this.col + 1
  }

  moveToNewLine() {
    this.idx=this.idx
    this.col=1
    this.row=this.row + 1
  }

  toString() {
    return `(idx=${this.idx},row=${this.row},col=${this.col})`
  }
}


interface Token {
  tokenType: TokenType
  position: Pos
  afterSpace: boolean
}

class SimpleToken implements Token {

  tokenType: TokenType
  position: Pos
  afterSpace: boolean

  constructor(tokenType: TokenType, position: Pos, afterSpace: boolean) {
    this.tokenType = tokenType;
    this.position = position;
    this.afterSpace = afterSpace;
  }

  toString(): string {
    return `SimpleToken(tokenType=${TokenType[this.tokenType]},position=${this.position.toString()},afterSpace=${this.afterSpace})`
  }
}

class LiteralToken<T> implements Token {
  value: T
  tokenType: TokenType
  position: Pos
  afterSpace: boolean

  constructor(tokenType: TokenType, value: T, position: Pos, afterSpace: boolean) {
    this.tokenType = tokenType;
    this.value = value;
    this.position = position;
    this.afterSpace = afterSpace;
  }

  toString(): string {
    let strValue: string;
    if (this.tokenType == TokenType.STRING_LITERAL) {
      strValue = `"${this.value}"`;
    } else {
      strValue = `${this.value}`;
    }
    return `LiteralToken(tokenType=${TokenType[this.tokenType]},value=${strValue},position=${this.position.toString()},afterSpace=${this.afterSpace})`
  }
}

class StringLiteral extends LiteralToken<string> {
  constructor(value: string, position: Pos, afterSpace: boolean) {
    super(TokenType.STRING_LITERAL, value, position, afterSpace);
  }
}

class IntLiteral extends LiteralToken<number> {
  constructor(value: number, position: Pos, afterSpace: boolean) {
    super(TokenType.INT_LITERAL, value, position, afterSpace);
  }
}

class FloatLiteral extends LiteralToken<number> {
  constructor(value: number, position: Pos, afterSpace: boolean) {
    super(TokenType.FLOAT_LITERAL, value, position, afterSpace);
  }
}

class Identifier implements Token {
  value: string
  tokenType: TokenType
  position: Pos
  afterSpace: boolean

  constructor (value: string, position: Pos, afterSpace: boolean) {
    this.tokenType = TokenType.IDENTIFIER_TK;
    this.value = value;
    this.position = position;
    this.afterSpace = afterSpace;
  }

  toString(): string {
    return `Identifier(value="${this.value}",position=${this.position.toString()},afterSpace=${this.afterSpace})`
  }
}

class EofToken implements Token {
  tokenType: TokenType
  position: Pos
  afterSpace: boolean

  constructor (position: Pos, afterSpace: boolean) {
    this.tokenType = TokenType.EOF;
    this.position = position;
    this.afterSpace = afterSpace;
  }

  toString(): string {
    return `EofToken(position=${this.position.toString()},afterSpace=${this.afterSpace})`
  }
}

class ParseError extends Error {}