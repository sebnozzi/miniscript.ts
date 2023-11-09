
Next steps:
- Implement implicits:
  - val()
  - abs
  - pop
  - pull
  - push
  - shuffle
  - sign
  - slice
  - sort
  - log
  - split
  - sqrt
  - sum
  - lower
  - upper
  - insert
  - remove
  - replace
  - hasIndex
  - char
  - code
  - values
  - indexes
  - round
  - floor
  - ceil
  - acos
  - asin
  - pi
  - atan
  - sin
  - cos
  - bitAnd
  - bitOr
  - bitXor
  - len() for strings / lists
- String check for immutability (string index assignment should fail at runtime)
- Implement implicits:
  - time
  - wait
  - hash
  - globals
  - locals
  - version
  Types (maps)
  - funcRef
  - list
  - string
  - number
  - map
- function invocation on objects (foo.method(1,2,3)) 
  - test instrinsic methods
- map literals / map expressions
- len() for maps
- indexed-assignment (x[idx] = expr) for maps
- field-assignment (expr.fieldName = expr)
- `(null)[1] = 1` should throw error
- Invalid relative comparisons return null
  - At least they do in the official miniScript ... seems not to be intentional

===

Optimization ideas:
- Compile expressions like "x = x + 1" to a ONE opcode
  Of course the same for "x += 1"

- Have internal "range" objects, that act as iterators ...
  That is: don't generate all values at once, but give them as-needed

===

More types?
- Maps / objects

First implement miniScript completely?
Then introduce graphic capabilities?

Do a spike with assembler => bytecode?
Or even miniScript => bytecode?
(but this should not be scope of this project?)

First graphic intrinsitcs?

Sourcemaps? (this makes sense when we compile code)

---
1) Make it work (cover all of MiniScript)

2) Make it debuggable

3) THEN make it fast(er)


Possible performance optimizations:
- From microScript:
  - avoid pop/push by manipulating stack in-place
  - avoid de-referencing by moving important variables locally and moving back to objects when done
  - use primitive types wherever possible (done for numbers)
  - pre-allocate local variable slots? (access them by number instead of resolving each time)
  - use only one stack for locals with a moving "offset"?
    - only possible if the amount of local variables is fixed
  - the compiler now emits sub-optimal bytecode sequences
    - one can re-combine some bytecodes into more compact ones ()
- Multi-pass: (advanced!)
  - Re-combine some bytecode sequences into more compact ones?
  - Re-write bytecodes into their inlined JS implementation
    - Then instead of doing a switch/jump one runs JS snippets
  - Combine JS-snippets in a source-map boundary (debug-step boundary, typically a line) into one JS-snippet
  - If one does not do debugging, combine al JS-snippets into one within a "jump" boundary (while / for / function-call).

Done:
  - use parallel arrays for opcodes / args (use ref / arg like microScript?)
