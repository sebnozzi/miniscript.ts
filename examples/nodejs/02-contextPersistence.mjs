import { Interpreter } from "../../dist/miniscript-ts.mjs"

const interp = new Interpreter();
let code = `print "Defining function ..."
sumTwo = function(a,b)
  return a + b
end function`;
interp.runSrcCode(code);
// Now let's _use_ the function
code = `print sumTwo(3,2)`;
// Run new code, but in the same context
interp.runSrcCode(code);