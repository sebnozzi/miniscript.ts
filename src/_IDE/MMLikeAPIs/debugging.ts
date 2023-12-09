function addConsoleLogging(vm: Processor) {

  vm.addIntrinsic("consoleLog(arg)",
  function(arg: any) {
    if (arg instanceof Array) {
      console.log(...arg);
    } else {
      console.log(arg);
    }
  });

}