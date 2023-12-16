import { SrcLocation } from "./commonModel"
import { TokenType } from "./tokenTypes"

export interface Token {
  tokenType: TokenType
  location: SrcLocation
  afterSpace: boolean
}

export class SimpleToken implements Token {

  tokenType: TokenType
  location: SrcLocation
  afterSpace: boolean

  constructor(tokenType: TokenType, location: SrcLocation, afterSpace: boolean) {
    this.tokenType = tokenType;
    this.location = location;
    this.afterSpace = afterSpace;
  }

  toString(): string {
    return `SimpleToken(tokenType=${TokenType[this.tokenType]},position=${this.location.toString()},afterSpace=${this.afterSpace})`
  }
}

export class LiteralToken<T> implements Token {
  value: T
  tokenType: TokenType
  location: SrcLocation
  afterSpace: boolean

  constructor(tokenType: TokenType, value: T, position: SrcLocation, afterSpace: boolean) {
    this.tokenType = tokenType;
    this.value = value;
    this.location = position;
    this.afterSpace = afterSpace;
  }

  toString(): string {
    let strValue: string;
    if (this.tokenType == TokenType.STRING_LITERAL) {
      strValue = `"${this.value}"`;
    } else {
      strValue = `${this.value}`;
    }
    return `LiteralToken(tokenType=${TokenType[this.tokenType]},value=${strValue},position=${this.location.toString()},afterSpace=${this.afterSpace})`
  }
}

export class StringLiteral extends LiteralToken<string> {
  constructor(value: string, location: SrcLocation, afterSpace: boolean) {
    super(TokenType.STRING_LITERAL, value, location, afterSpace);
  }
}

export class IntLiteral extends LiteralToken<number> {
  constructor(value: number, location: SrcLocation, afterSpace: boolean) {
    super(TokenType.INT_LITERAL, value, location, afterSpace);
  }
}

export class FloatLiteral extends LiteralToken<number> {
  constructor(value: number, location: SrcLocation, afterSpace: boolean) {
    super(TokenType.FLOAT_LITERAL, value, location, afterSpace);
  }
}

export class Identifier implements Token {
  value: string
  tokenType: TokenType
  location: SrcLocation
  afterSpace: boolean

  constructor (value: string, location: SrcLocation, afterSpace: boolean) {
    this.tokenType = TokenType.IDENTIFIER_TK;
    this.value = value;
    this.location = location;
    this.afterSpace = afterSpace;
  }

  toString(): string {
    return `Identifier(value="${this.value}",position=${this.location.toString()},afterSpace=${this.afterSpace})`
  }
}

export class EofToken implements Token {
  tokenType: TokenType
  location: SrcLocation
  afterSpace: boolean

  constructor (location: SrcLocation, afterSpace: boolean) {
    this.tokenType = TokenType.EOF;
    this.location = location;
    this.afterSpace = afterSpace;
  }

  toString(): string {
    return `EofToken(position=${this.location.toString()},afterSpace=${this.afterSpace})`
  }
}
