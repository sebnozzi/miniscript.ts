
function addMathIntrinsics(p: Processor) {

  p.addGlobalIntrinsic("abs(x)", 
  function(x: any): number {
    if (typeof x === "number") {
      return Math.abs(x);
    } else {
      return 0;
    }
  });
  
  p.addGlobalIntrinsic("floor(n)", 
  function(n: any): number {
    if (typeof n === "number") {
      return Math.floor(n);
    } else {
      return 0;
    }
  });

  p.addGlobalIntrinsic("ceil(n)", 
  function(n: any): number {
    if (typeof n === "number") {
      return Math.ceil(n);
    } else {
      return 0;
    }
  });

  p.addGlobalIntrinsic("round(n,decimalPlaces=0)", 
  function(n: any, decimalPlaces: any): number {
    const result = round(n, decimalPlaces);
    if (result !== undefined ) {
      return result;
    } else {
      return 0;
    }
  });

  p.addGlobalIntrinsic("pi", 
  function(): number {
    return Math.PI;
  });

  p.addGlobalIntrinsic("sin(x)", 
  function(x: any): number {
    return Math.sin(x);
  });

  p.addGlobalIntrinsic("cos(x)", 
  function(x: any): number {
    return Math.cos(x);
  });

  p.addGlobalIntrinsic("tan(x)", 
  function(x: any): number {
    return Math.tan(x);
  });

  p.addGlobalIntrinsic("asin(x)", 
  function(x: any): number {
    return Math.asin(x);
  });

  p.addGlobalIntrinsic("acos(x)", 
  function(x: any): number {
    return Math.acos(x);
  });

  p.addGlobalIntrinsic("atan(x)", 
  function(x: any): number {
    return Math.atan(x);
  });

  p.addGlobalIntrinsic("sign(n)", 
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

  p.addGlobalIntrinsic("log(x,base=10)", 
  function(x: any, base: any): number {
    if (typeof x === "number" && typeof base === "number") {
      return Math.log(x) / Math.log(base);
    }
    return 0;
  });

  p.addGlobalIntrinsic("sqrt(x)", 
  function(x: any): number {
    if (typeof x === "number") {
      return Math.sqrt(x);
    }
    return 0;
  });

}
