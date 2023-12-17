import { Interpreter, newMap } from "../../dist/miniscript-ts.mjs"

const interp = new Interpreter();
// A typical pattern is to have a map which represents either a "super-type"
// or a singleton object. In order for this to be accessible one needs to
// define in turn an intrinsic function that returns such value.

// First we need the map / object.
// The module exposes a `newMap` function for that!
const myType = newMap();

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