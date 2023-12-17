import { Interpreter } from "../../dist/miniscript-ts.mjs"

const interp = new Interpreter();
let code = `print "Hello " * 3
            for i in range(1,10); print i; end for`;
interp.runSrcCode(code);