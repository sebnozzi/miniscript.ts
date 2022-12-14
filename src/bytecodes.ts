
const enum BC {
  PUSH_VAR,
  PUSH_INT,
  ASSIGN_LOCAL,
  
  // Adds two stack values, leaving result in the stack
  ADD_VALUES,
  // Adds a value to a stack value; result is in the stack
  ADD_N,

  SUBTR_N,
  DIVIDE_N,

  JUMP,
  JUMP_GE,
  JUMP_GT,

  CALL,
  RETURN,
  EXIT,

  CALL_NATIVE,

  PRINT_TOP,
};
