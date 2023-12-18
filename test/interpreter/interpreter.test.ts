import { describe, it, assert } from "vitest";
import { Interpreter } from "../../src/interpreter/interpreter";

describe("Interpreter", async () => {
  
  it("should run code", async () => {
    const srcCode = "a = 1 + 1"
    const interpreter = new Interpreter();
    interpreter.runSrcCode(srcCode);
    const a = interpreter.globalContext.getOpt("a")
    assert.equal(2, a);
  });

  it("should create a map", () => {

    const interp = new Interpreter();
    // A typical pattern is to have a map which represents either a "super-type"
    // or a singleton object. In order for this to be accessible one needs to
    // define in turn an intrinsic function that returns such value.
    
    // First we need the map / object.
    const myType = interp.newMap();
    
    // Then we create the intrinsic function to get ahold of it.
    interp.addIntrinsic("MyType", () => {
      return myType;
    });
    
    // At this point you can do `new MyType` on MiniScript.
    
    // Now let's augment the type with an intrinsic map-function.
    interp.addMapIntrinsic(myType, "someMethod", () => {
      console.log("Method called!");
    });
    
    // Let's use what we have
    let code = `
      m = new MyType
      m.someMethod`;
    interp.runSrcCode(code);
  })

});