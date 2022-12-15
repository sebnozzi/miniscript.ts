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
}

class StringLiteral extends LiteralToken<string> {
  constructor(value: string, position: Pos, afterSpace: boolean) {
    super(TokenType.STRING_LITERAL, value, position, afterSpace);
  }
}

class IntLiteral extends LiteralToken<string> {
  constructor(value: string, position: Pos, afterSpace: boolean) {
    super(TokenType.INT_LITERAL, value, position, afterSpace);
  }
}

class FloatLiteral extends LiteralToken<string> {
  constructor(value: string, position: Pos, afterSpace: boolean) {
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
}