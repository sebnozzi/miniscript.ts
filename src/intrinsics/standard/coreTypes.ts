import { MSMap } from "../../vm/msmap";
import { Processor } from "../../vm/processor";

export function addCoreTypesIntrinsics(p: Processor) {

  p.addIntrinsic("string", 
  function(): MSMap {
    return p.stringCoreType;
  });

  p.addIntrinsic("list", 
  function(): MSMap {
    return p.listCoreType;
  });

  p.addIntrinsic("map", 
  function(): MSMap {
    return p.mapCoreType;
  });

  p.addIntrinsic("number", 
  function(): MSMap {
    return p.numberCoreType;
  });

  p.addIntrinsic("funcRef", 
  function(): MSMap {
    return p.funcRefCoreType;
  });

}