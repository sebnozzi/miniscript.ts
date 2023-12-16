import { Processor } from "../../vm/processor";
import { round } from "../../vm/runtime";

export function addMathIntrinsics(p: Processor) {

  p.addIntrinsic("abs(x)", 
  function(x: any): number {
    if (typeof x === "number") {
      return Math.abs(x);
    } else {
      return 0;
    }
  });
  
  p.addIntrinsic("floor(n)", 
  function(n: any): number {
    if (typeof n === "number") {
      return Math.floor(n);
    } else {
      return 0;
    }
  });

  p.addIntrinsic("ceil(n)", 
  function(n: any): number {
    if (typeof n === "number") {
      return Math.ceil(n);
    } else {
      return 0;
    }
  });

  p.addIntrinsic("round(n,decimalPlaces=0)", 
  function(n: any, decimalPlaces: any): number {
    const result = round(n, decimalPlaces);
    if (result !== undefined ) {
      return result;
    } else {
      return 0;
    }
  });

  p.addIntrinsic("pi", 
  function(): number {
    return Math.PI;
  });

  p.addIntrinsic("sin(x)", 
  function(x: any): number {
    return Math.sin(x);
  });

  p.addIntrinsic("cos(x)", 
  function(x: any): number {
    return Math.cos(x);
  });

  p.addIntrinsic("tan(x)", 
  function(x: any): number {
    return Math.tan(x);
  });

  p.addIntrinsic("asin(x)", 
  function(x: any): number {
    return Math.asin(x);
  });

  p.addIntrinsic("acos(x)", 
  function(x: any): number {
    return Math.acos(x);
  });

  p.addIntrinsic("atan(x)", 
  function(x: any): number {
    return Math.atan(x);
  });

  p.addIntrinsic("sign(n)", 
  function(n: any): number {
    if (typeof n === "number") {
      if (n > 0) {
        return 1;
      } else if (n < 0) {
        return -1;
      }
    }
    return 0;
  });

  p.addIntrinsic("log(x,base=10)", 
  function(x: any, base: any): number {
    if (typeof x === "number" && typeof base === "number") {
      return Math.log(x) / Math.log(base);
    }
    return 0;
  });

  p.addIntrinsic("sqrt(x)", 
  function(x: any): number {
    if (typeof x === "number") {
      return Math.sqrt(x);
    }
    return 0;
  });

}
