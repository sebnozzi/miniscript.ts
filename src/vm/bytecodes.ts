
enum BC {
  // Push primitive value to stack
  PUSH,

  // Resolve variable and push value to stack
  EVAL_ID,

  // Assign value to local variable
  ASSIGN_LOCAL,
  
  // Adds two stack values, leaving result in the stack
  ADD_VALUES,
  // Adds a value to a stack value; result is in the stack
  ADD_N,

  // Subtract two stack values, leaving result in the stack
  SUBTRACT_VALUES,

  MULTIPLY_VALUES,
  DIVIDE_VALUES,
  POWER_VALUES,

  SUBTR_N,
  DIVIDE_N,

  LOGIC_AND_VALUES,
  LOGIC_OR_VALUES,

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

  CALL_TRANSPILED,

  POP,
  PRINT_TOP,
};
