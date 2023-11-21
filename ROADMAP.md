
Next steps:
- Test isa-equality with base-maps:
  - funcRef
  - list
  - string
  - number
  - map
- Implement intrinsics:
  - version
  - stackTrace
- Investigte: convert all calling forms to 
  push expr as funcRef
  push params
  call funcRef with params?
- Also: do we support expressions that are NOT function calls but
        evaluate to func-refs with params?
- Make intrinsics not "pollute" the global scope
  They are resolved if anything else fails AFTER the global
  scope is exhausted.
- Split intrinsics into different files
- Split parser into different files / classes
- Do a code review and compare intrinsics impl. with official one
  - Check type conversions
  - Check edge cases
  - Check that indexes in intrinsics are converted to int
  - Check that checkRange is used
- Investigate using JS's "String" objects for strings so that refEquals 
  behaves like C# miniScript. Right now we are using primitive
  strings and there is no way to tell one reference from the
  other. There is no official test for this.
- Implement importing of modules
- Optional delimiter for print (print "Hello", "")
  - Difficult to test because we output "per line"
- `(null)[1] = 1` should throw error
- Re-introduce debugger?
- Normalize ALL (!) errors, check original code.
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

Possible performance optimizations:
- From microScript:
  - avoid pop/push by manipulating stack in-place
  - avoid de-referencing by moving important variables locally and moving back to objects when done
- Multi-pass: (advanced!)
  - Re-combine some bytecode sequences into more compact ones?
  - Re-write bytecodes into their inlined JS implementation
    - Then instead of doing a switch/jump one runs JS snippets
  - Combine JS-snippets in a source-map boundary (debug-step boundary, typically a line) into one JS-snippet
  - If one does not do debugging, combine al JS-snippets into one within a "jump" boundary (while / for / function-call).
