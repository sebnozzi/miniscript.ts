
enum BC {
  // Push primitive value to stack
  PUSH,

  // Resolve variable and push value to stack
  PUSH_VAR,

  // Assign value to local variable
  ASSIGN_LOCAL,
  
  // Adds two stack values, leaving result in the stack
  ADD_VALUES,
  // Adds a value to a stack value; result is in the stack
  ADD_N,

  // Subtract two stack values, leaving result in the stack
  SUBTRACT_VALUES,

  SUBTR_N,
  DIVIDE_N,

  COMPARE_GE,
  COMPARE_GT,
  COMPARE_LE,
  COMPARE_LT,

  JUMP,
  JUMP_GE,
  JUMP_GT,
  JUMP_FALSE,

  CALL,
  RETURN,
  EXIT,

  CALL_PRIMITIVE,
  CALL_TRANSPILED,

  PRINT_TOP,
};
