import { Interpreter } from "../../dist/miniscript-ts.mjs"

const interp = new Interpreter();
// Use a MiniScript function signature. Default values are supported.
// Then provide a JavaScript anonymous function. 
interp.addIntrinsic("mySum(a=0,b=0)", (a, b) => {
  return a + b;
});
// Let's call the intrinsic
let code = `
  print mySum(8,4)
  print mySum(2)`;
interp.runSrcCode(code);