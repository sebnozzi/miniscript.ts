import { Interpreter } from "../../dist/miniscript-ts.mjs"

const interp = new Interpreter();
let code = `s = "Hello " * 3`;
interp.runSrcCode(code);
// Access the globalContext property
const context = interp.globalContext;
// Ask for a value by key. Result might be _undefined_.
const value = context.getOpt("s");
if (value !== undefined) {
  console.log("We got from the global context that 's' is:", value);
}