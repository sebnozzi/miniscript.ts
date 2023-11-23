
function addBitOperationIntrinsics(p: Processor) {

  p.addGlobalIntrinsic("bitAnd(i=0,j=0)", 
  function(i: any, j: any): number {
    i = toIntegerValue(i);
    j = toIntegerValue(j);
    return i & j;
  });

  p.addGlobalIntrinsic("bitOr(i=0,j=0)", 
  function(i: any, j: any): number {
    i = toIntegerValue(i);
    j = toIntegerValue(j);
    return i | j;
  });

  p.addGlobalIntrinsic("bitXor(i=0,j=0)", 
  function(i: any, j: any): number {
    i = toIntegerValue(i);
    j = toIntegerValue(j);
    return i ^ j;
  });

}