
Next steps:
- unary expressions (not X, -(3*5))
- unary "new" for Maps (with "__isa" pointing)
- property access for Map (with "__isa" resolution)
- len() for maps
- simple (?) (one level, no nesting?) property access for maps
  - Although, if it's done for ONE level it's done for ANY depth
- Scientific notation (big?) numbers 
  - How is this done?
  - Parsed and stored as doubles
  - Formatted accordingly for numbers with lots of digits
- Implement implicits:
  - round
  - floor
  - ceil
  - sign
  - abs
  - val()
  - log
  - sqrt
  - lower
  - upper
  - pop
  - pull
  - push
  - shuffle
  - slice
  - sort
  - split
  - sum
  - insert
  - remove
  - replace
  - hasIndex
  - char
  - code
  - values
  - indexes
  - acos
  - asin
  - pi
  - atan
  - sin
  - cos
  - bitAnd
  - bitOr
  - bitXor
  - refEquals(a, b)
  - len() for strings / lists
- String check for immutability (string index assignment should fail at runtime)
- Implement implicits:
  - globals
  - locals
  - time
  - wait
  - yield
  - hash
  - version
  - stackTrace
  Types (maps)
  - funcRef
  - list
  - string
  - number
  - map
- Optional delimiter for print (print "Hello", "")
  - Difficult to test because we output "per line"
- function invocation on objects (foo.method(1,2,3)) 
  - test instrinsic methods
- field-assignment (expr.fieldName = expr)
- self-functions (functions with first parameter "self" which
  can be added to maps and work as methods).
- `(null)[1] = 1` should throw error
- Partial parsing ... useful in interactive environments
  - The parser should know if input is "pending" and return
    signalling that it can wait for more input (as in a co-routine)
    When the parser considers that the input is complete then the
    whole process continues.
    This should be easily doable because these cases are of the type
    "expected X found EOF". Not so simple - counter-example:
    print a["name",
- Invalid relative comparisons return null
  - At least they do in the official miniScript ... seems not to be intentional
- Static lists / maps can be further optimized, all expressions could be potentially
  known at compile-time if the leaves of the tree consist of literals
  This can be played a step further ... for all expressions known at compile-time
  they could be generated at compile time ... even things like 300 + 200 / 2

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
