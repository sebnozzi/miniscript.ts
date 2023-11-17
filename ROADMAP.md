
Next steps:
- Implement
  - insert
  - remove
  - replace
  - sign
  - val
  - join
  - split
  - char
  - code
  - pi
  - acos
  - asin
  - atan
  - sin
  - cos
  - log
  - sqrt
- Implement special-identifiers:
  - globals
  - locals
  - Intrinsics don't "pollute" the global scope
    They are resolved if anything else fails AFTER the global
    scope is exhausted. That's why they don't appear.
  - globals / locals can not be set-to, only accessed
    I mean, this is illegal
      globals = ...
      locals = ...
    But this is OK:
      globals["lslsl"] = ...
      locals["sksks] = ... 
  - Implement super
- Implement intrinsics:
  - shuffle
  - slice
  - split
  - bitAnd
  - bitOr
  - bitXor
  - refEquals(a, b)
- Test isa-equality with base-maps:
  - funcRef
  - list
  - string
  - number
  - map
- Write tests for operator precedence ... could be that the parser has bugs!
  https://miniscript.org/wiki/Operators
- Normalize errors
  Compiler Error: 'for' without matching 'end for' [line 3]
  Runtime Error: Too Many Arguments [line 2]
  (so that many tests pass)
- Implement intrinsics:
  - time
  - wait
  - yield
  - hash
  - version
  - stackTrace
- Scientific notation (big?) numbers 
  - How is this done?
  - Parsed and stored as doubles
  - Formatted accordingly for numbers with lots of digits
- Optional delimiter for print (print "Hello", "")
  - Difficult to test because we output "per line"
- `(null)[1] = 1` should throw error
- Re-introduce debugger?
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
- Introduce a "strict-mode". Don't allow:
  - Repeated arguments of the same name
  - Putting a "self" argument anywhere but in the first position
  - Runtime errors for all operations that don't make sense
    - No more things resulting to null

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
