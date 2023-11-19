
enum BC {
  // Push primitive value to stack
  PUSH,

  // Resolve variable and push value to stack
  EVAL_ID,

  // Perform indexed access (on map/list) using brackets, lile myCollection[23]
  INDEXED_ACCESS,
  // Access property using "dot-notation", as in myMap.myProperty
  DOT_ACCESS,
  // Access property at "super" using "dot-notation", as in super.myProperty
  SUPER_DOT_ACCESS,
  // Perform a slice on a sequence (List or String, NOT Map)
  SLICE_SEQUENCE,

  // Assign value to local variable
  ASSIGN_LOCAL,
  // Assign value using indexed access, like myFoo[key] = value
  ASSIGN_INDEXED,
  // Assign property using dot-notation, like myMap.property = value
  DOT_ASSIGN,

  // Various forms of math-assignments
  MATH_ASSIGN_LOCAL,
  MATH_ASSIGN_INDEXED,
  MATH_DOT_ASSIGN,

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

  NEGATE_BOOLEAN,
  NEGATE_NUMBER,

  COMPARE_EQ,
  COMPARE_NE,

  COMPARE_GE,
  COMPARE_GT,
  COMPARE_LE,
  COMPARE_LT,

  COMPARE_ISA,

  // Build a List from values on the stack
  // Push resulting List back
  BUILD_LIST,
  // Build a Map from values on the stack
  // Push resulting Map back
  BUILD_MAP,
  // Instantiate new Map using `new``
  NEW_MAP,

  // Perform a "chained comparison"
  CHAINED_COMPARISON,

  JUMP,
  POP_JUMP_FALSE,
  JUMP_IF_FALSE,
  JUMP_IF_TRUE,

  CALL,
  DOT_CALL,
  RETURN,
  EXIT,
  
  POP,
  PRINT_TOP,

  CREATE_FOR_LOOP,
  ITERATE_FOR_LOOP,
  BREAK_FOR_LOOP,
  CONTINUE_FOR_LOOP,
};
