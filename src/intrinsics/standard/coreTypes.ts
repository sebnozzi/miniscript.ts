import { HashMap } from "../../vm/hashmap";
import { Processor } from "../../vm/processor";

export function addCoreTypesIntrinsics(p: Processor) {

  p.addIntrinsic("string", 
  function(): HashMap {
    return p.stringCoreType;
  });

  p.addIntrinsic("list", 
  function(): HashMap {
    return p.listCoreType;
  });

  p.addIntrinsic("map", 
  function(): HashMap {
    return p.mapCoreType;
  });

  p.addIntrinsic("number", 
  function(): HashMap {
    return p.numberCoreType;
  });

  p.addIntrinsic("funcRef", 
  function(): HashMap {
    return p.funcRefCoreType;
  });

}