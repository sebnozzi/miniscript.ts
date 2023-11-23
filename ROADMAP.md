
Next steps:
- Solve the issues revealed by the RosettaCode programs:
  - range(10,9,1) should deliver an empty range, not throw error
  - "function" is not part of expression when parsing? 
    f = function
      return function(x)
          print x
      end function
    end function
  - print + delimiter
  - Bacon_cipher: "len" is missing and src-line-number is null 
    (srcmap entry missig!)

- Write blog-post about it
  - Describe the architecture

- Use another map implementation for Contexts
  since we KNOW that the keys are always strings.
  Associative arrays?
  => Using JS {} objects renders a speed increase
     of 30%! Consider this for contexts, but switch
     back to HashMap as soon as a key is not a string.

- Slowly re-create SebIDE using miniScript.TS?
- Show console output on the HTML page
- Show errors on the HTML page

- Split intrinsics into different files
- Implement interesting graphics intrinsics to show-off mini-projects
  - Using HTML Canvas
  - Drawing shapes (lines, boxes, circles)
  - Drawing text
  - Loading images
  - Drawing images
  - Reading keys
  - Reading mouse-clicks
  - Loading sounds
  - Playing sounds

- Write some demos

- Re-introduce debugger?
- Debugger: willExecuteCall is incomplete ... many more opcodes could
  result in a call. At the end we should offer the "step-in" button for
  all *potential* calls, but only jump in if there was a real call.
  It is probably also obsolete (or should be). Let the sourcemap decide
  whether an entry contains a call or not (like it's the case right now).
  Remove method from Processor. Beware: "containsCall" in CodeBuilder is
  incomplete!


- Work on making this public
  - Upload demo(s)
  - Add license
  - Publish repo

- Test code with real-world code to expose bugs
  - Rossetta Code
  - Benchmark Code
- Make intrinsics not "pollute" the global scope
  They are resolved if anything else fails AFTER the global
  scope is exhausted.
- Make the amount of cycles to execute per "burst" auto-tune
  so that we "yield" 60 times per second.
  - Maybe decide an amount of cycles to "check" for a timeout?
- Implement importing of modules
- Optional delimiter for print (print "Hello", "")
  - Difficult to test because we output "per line"
- Implement intrinsics:
  - version
  - stackTrace
- Investigte: convert all calling forms to 
  push expr as funcRef
  push params
  call funcRef with params?
- Also: do we support expressions that are NOT function calls but
        evaluate to func-refs with params?
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


- Normalize ALL (!) errors, check original code.
- Partial parsing ... useful in interactive environments
  - The parser should know if input is "pending" and return
    signalling that it can wait for more input (as in a co-routine)
    When the parser considers that the input is complete then the
    whole process continues.
    This should be easily doable because these cases are of the type
    "expected X found EOF". Not so simple - counter-example:
    print a["name",
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
