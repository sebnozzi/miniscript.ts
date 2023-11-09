
enum BC {
  // Push primitive value to stack
  PUSH,

  // Resolve variable and push value to stack
  EVAL_ID,

  // Perform indexed access (on map/list) using brackets, lile myCollection[23]
  INDEXED_ACCESS,
  // Perform a slice on a sequence (List or String, NOT Map)
  SLICE_SEQUENCE,

  // Assign value to local variable
  ASSIGN_LOCAL,
  // Assign value using indexed access, like myFoo[key] = value
  ASSIGN_INDEXED,

  // Adds two stack values, leaving result in the stack
  ADD_VALUES,

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
  COMPARE_NE,

  COMPARE_GE,
  COMPARE_GT,
  COMPARE_LE,
  COMPARE_LT,

  // Perform a "chained comparison"
  CHAINED_COMPARISON,

  JUMP,
  POP_JUMP_FALSE,
  JUMP_IF_FALSE,
  JUMP_IF_TRUE,

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
