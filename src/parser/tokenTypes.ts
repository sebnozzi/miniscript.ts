enum TokenType {

  NEWLINE,
  SEMICOLON,

  STRING_LITERAL,
  INT_LITERAL,
  FLOAT_LITERAL,
  IDENTIFIER_TK,

  OPEN_CURLY,
  OPEN_SQUARE,
  OPEN_ROUND,

  CLOSE_CURLY,
  CLOSE_SQUARE,
  CLOSE_ROUND,

  DOT,
  COLON,
  COMMA,

  ASSIGN,
  PLUS_ASSIGN,
  MINUS_ASSIGN,
  MULT_ASSIGN,
  DIV_ASSIGN,
  MOD_ASSIGN,
  POW_ASSIGN,

  OP_EQUALS,
  OP_NOT_EQUALS,

  OP_OR,
  OP_AND,

  OP_LESS,
  OP_LESS_EQUALS,
  OP_GREATER,
  OP_GREATER_EQUALS,
  
  OP_PLUS,
  OP_MINUS,
  OP_MOD,
  OP_DIV,
  OP_MULT,
  OP_POW,

  OP_NOT,
  OP_FUNCREF,
  OP_ISA,

  KW_TRUE,
  KW_FALSE,
  KW_NULL,
  KW_SUPER,

  KW_IF,
  KW_THEN,
  KW_ELSE,
  KW_ELSE_IF,

  KW_WHILE,
  KW_FOR,
  KW_IN,
  KW_BREAK,
  KW_CONTINUE,

  KW_NEW,
  KW_FUNCTION,
  KW_RETURN,

  // Only temporary: combined later to one of the END_X tokens
  KW_END,

  KW_END_IF,
  KW_END_FOR,
  KW_END_WHILE,
  KW_END_FUNCTION,

  EOF,
}

function toOfficialImplTokenName(tokenType: TokenType): string {
  switch(tokenType) {
    case TokenType.COMMA:
      return "Comma"
    case TokenType.OPEN_ROUND:
      return "LParen"
    case TokenType.CLOSE_ROUND:
      return "RParen"
    default:
      TokenType[tokenType]
      return `${TokenType[tokenType]}`
  }
}