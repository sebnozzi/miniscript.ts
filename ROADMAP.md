
Next steps:
- Support for "self" in method bodies
- Rename property-access to "dotted-access", or see how it is referred
  to in the official docs
- Support for magic functions with self as first parameter
- function invocation on objects (foo.method(1,2,3)) 
  - test instrinsic methods
- self-functions (functions with first parameter "self" which
  can be added to maps and work as methods).
- Support built-in methods for String / List / Map / Number ...
  These are not shown when inspecting values ... are probably "found"
  when normal index-lookup fail. They can also be overridden for Maps.
  This means supporting invoking methods on things different than Maps
  (like strings, lists, etc.) because they are also "objects".
- Write tests for operator precedence ... could be that the parser has bugs!
  https://miniscript.org/wiki/Operators
- Implement implicits:
  - globals
  - locals
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
  - len()
- Re-introduce debugger
- Implement implicits:
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
- Scientific notation (big?) numbers 
  - How is this done?
  - Parsed and stored as doubles
  - Formatted accordingly for numbers with lots of digits
- Optional delimiter for print (print "Hello", "")
  - Difficult to test because we output "per line"
- `(null)[1] = 1` should throw error
- Partial parsing ... useful in interactive environments
  - The parser should know if input is "pending" and return
    signalling that it can wait for more input (as in a co-routine)
    When the parser considers that the input is complete then the
    whole process continues.
    This should be easily doable because these cases are of the type
    "expected X found EOF". Not so simple - counter-example:
    print a["name",
- Debugger: willExecuteCall is incomplete ... many more opcodes could
  result in a call
- Evaluate if we can use only dynamic dot-calls

===

Optimization ideas:
- Compile expressions like "x = x + 1" to a ONE opcode
  Of course the same for "x += 1"

- Have internal "range" objects, that act as iterators ...
  That is: don't generate all values at once, but give them as-needed

===

Possible performance optimizations:
- From microScript:
  - avoid pop/push by manipulating stack in-place
  - avoid de-referencing by moving important variables locally and moving back to objects when done
  - pre-allocate local variable slots? (access them by number instead of resolving each time)
  - the compiler now emits sub-optimal bytecode sequences
    - one can re-combine some bytecodes into more compact ones ()
- Multi-pass: (advanced!)
  - Re-combine some bytecode sequences into more compact ones?
  - Re-write bytecodes into their inlined JS implementation
    - Then instead of doing a switch/jump one runs JS snippets
  - Combine JS-snippets in a source-map boundary (debug-step boundary, typically a line) into one JS-snippet
  - If one does not do debugging, combine al JS-snippets into one within a "jump" boundary (while / for / function-call).
