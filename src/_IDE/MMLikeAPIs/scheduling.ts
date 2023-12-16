import { Processor } from "../../vm/processor";

export function addMMLikeSchedulingIntrinsics(vm: Processor) {

  vm.addIntrinsic("run",
  function() {
    vm.restartProgram();
    return vm.abortCallValue;
  });

  vm.addIntrinsic("exit",
  function() {
    vm.stopRunning();
    return vm.abortCallValue;
  })

}