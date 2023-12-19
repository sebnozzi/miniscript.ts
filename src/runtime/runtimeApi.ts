import { MSMap } from "../vm/msmap";
import { Processor } from "../vm/processor";

export class RuntimeAPI {

  constructor(private vm: Processor) {
  }

  newMap(): MSMap {
    return new MSMap(this.vm);
  }

  addIntrinsic(signature: string, impl: Function) {
    this.vm.addIntrinsic(signature, impl);
  }

  addMapIntrinsic(target: MSMap, signature: string, impl: Function) {
    this.vm.addMapIntrinsic(target, signature, impl);
  }

}