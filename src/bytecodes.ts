
const enum BC {
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

  SUBTR_N,
  DIVIDE_N,

  JUMP,
  JUMP_GE,
  JUMP_GT,

  CALL,
  RETURN,
  EXIT,

  CALL_PRIMITIVE,
  CALL_NATIVE,

  PRINT_TOP,
};
