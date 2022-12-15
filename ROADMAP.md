
Assembler? (text to bytecode)
UI / debugger?

More types?
- Arrays / Lists
- Strings
- Maps / objects

Intrinsics?
- print?

First implement miniScript completely?
Then introduce graphic capabilities?

Do a spike with assembler => bytecode?
Or even miniScript => bytecode?
(but this should not be scope of this project?)

First graphic intrinsitcs?

Sourcemaps? (this makes sense when we compile code)

---
Possible performance optimizations:
- From microScript:
  - avoid pop/push by manipulating stack in-place
  - avoid de-referencing by moving important variables locally and moving back to objects when done
  - use primitive types wherever possible (done for numbers)
  - use parallel arrays for opcodes / args (use ref / arg like microScript?)
  - pre-allocate local variable slots? (access them by number instead of resolving each time)
  - use only one stack for locals with a moving "offset"?