
function addCharIntrinsics(p: Processor) {
  
  p.addIntrinsic("code(x)", 
  function(x: any): number | null {
    if (x !== null) {
      const s = toString(x);
      if (x === "") {
        return null
      }
      const result = s.charCodeAt(0);
      return result;
    } else {
      return 0;
    }
  });

  p.addIntrinsic("char(n)", 
  function(x: any): string {
    if (typeof x === "number" && x > 0) {
      const s = String.fromCharCode(x)
      return s;
    }
    return String.fromCharCode(0);
  });

}
