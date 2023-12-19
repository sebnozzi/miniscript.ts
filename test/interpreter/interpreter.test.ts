import { describe, it, assert } from "vitest";
import { Interpreter } from "../../src/interpreter/interpreter";

describe("Interpreter", async () => {
  
  it("should run code", async () => {
    const srcCode = "a = 1 + 1"
    const interpreter = new Interpreter();
    interpreter.runSrcCode(srcCode);
    const globals = interpreter.runtime.globals;
    const a = globals.getOpt("a")
    assert.equal(2, a);
  });

  it("should run code asynchronously to completion", async () => {
    const srcCode = `
    a = "start"
    yield
    a = "end"
    `
    const interpreter = new Interpreter();
    await interpreter.runSrcCode(srcCode);
    const globals = interpreter.runtime.globals;
    const a = globals.getOpt("a")
    assert.equal("end", a);
  });

  it("should create a map", () => {

    const interp = new Interpreter();
    // A typical pattern is to have a map which represents either a "super-type"
    // or a singleton object. In order for this to be accessible one needs to
    // define in turn an intrinsic function that returns such value.
    
    const runtime = interp.runtime;
    const myType = runtime.newMap()
    
    // Then we create the intrinsic function to get ahold of it.
    runtime.addIntrinsic("MyType", () => {
      return myType;
    });
    
    // At this point you can do `new MyType` on MiniScript.
    
    // Now let's augment the type with an intrinsic map-function.
    runtime.addMapIntrinsic(myType, "someMethod", () => {
      console.log("Method called!");
    });
    
    // Let's use what we have
    let code = `
      m = new MyType
      m.someMethod`;
    interp.runSrcCode(code);
  })

});