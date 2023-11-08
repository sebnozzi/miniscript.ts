
enum BC {
  // Push primitive value to stack
  PUSH,

  // Resolve variable and push value to stack
  EVAL_ID,

  // Perform indexed access (on map/list) using brackets, lile myCollection[23]
  INDEXED_ACCESS,

  // Assign value to local variable
  ASSIGN_LOCAL,
  // Assign value using indexed access, like myFoo[key] = value
  ASSIGN_INDEXED,

  // Adds two stack values, leaving result in the stack
  ADD_VALUES,
  // Adds a value to a stack value; result is in the stack
  ADD_N,

  // Subtract two stack values, leaving result in the stack
  SUBTRACT_VALUES,

  MULTIPLY_VALUES,
  DIVIDE_VALUES,
  POWER_VALUES,
  MOD_VALUES,

  SUBTR_N,
  DIVIDE_N,

  LOGIC_AND_VALUES,
  LOGIC_OR_VALUES,

  COMPARE_EQ,

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
  
  POP,
  PRINT_TOP,

  CREATE_FOR_LOOP,
  ITERATE_FOR_LOOP,
  BREAK_FOR_LOOP,
  CONTINUE_FOR_LOOP,
};
