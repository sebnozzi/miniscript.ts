
function addIdentityIntrinsics(p: Processor) {

  p.addIntrinsic("hash(obj)", 
  function(obj: any): number {
    return hashCode(obj);
  });

  p.addIntrinsic("refEquals(a,b",
  function(a: any, b: any): number {
    let result: boolean = false;
    if (a === null) {
      result = (b === null);
    } else if (typeof a === "number") {
      result = (typeof b === "number" && a === b);
    } else if (typeof a === "string") {
      // NOTE: this does not behave like C# miniScript, where String objects
      // can have different references. This would suppose a major implementation
      // change (and possibly peformance loss) and no official test covers this. 
      // So we let it stay for now.
      result = (typeof b === "string" && a === b);
    } else if (a instanceof Array) {
      result = (b instanceof Array && a === b);
    } else if (a instanceof HashMap) {
      result = (b instanceof HashMap && a === b );
    } else if (a instanceof BoundFunction) {
      result = (b instanceof BoundFunction && a === b);
    } else {
      result = (equals(a,b) === 1);
    }
    return result ? 1 : 0;
  });

}
