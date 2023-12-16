import { Processor } from "../../vm/processor";
import { toIntegerValue } from "../../vm/runtime";

export function addBitOperationIntrinsics(p: Processor) {

  p.addIntrinsic("bitAnd(i=0,j=0)", 
  function(i: any, j: any): number {
    i = toIntegerValue(i);
    j = toIntegerValue(j);
    return i & j;
  });

  p.addIntrinsic("bitOr(i=0,j=0)", 
  function(i: any, j: any): number {
    i = toIntegerValue(i);
    j = toIntegerValue(j);
    return i | j;
  });

  p.addIntrinsic("bitXor(i=0,j=0)", 
  function(i: any, j: any): number {
    i = toIntegerValue(i);
    j = toIntegerValue(j);
    return i ^ j;
  });

}