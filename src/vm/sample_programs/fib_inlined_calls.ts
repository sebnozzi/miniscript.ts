

function inlineCallFibProgram(n: number) {
  const fibFunctions = [
    // 0: pre if-block
    function(vm: Processor) {
      vm.resolveAndPush("n")
      vm.pushValue(1)
      vm.compareLessEqual()
      vm.jumpIfFalse(2)
    },
    // 1: if block
    function(vm: Processor) {
      vm.resolveAndPush("n")
      vm.doReturn()
    },
    // 2: else (call 1)
    function(vm: Processor) {
      vm.resolveAndPush("n")
      vm.pushValue(1)
      vm.subtractValues()
      vm.resolveAndCall("fib")
    },
    // 3: else (call 2)
    function(vm: Processor) {
      vm.resolveAndPush("n")
      vm.pushValue(2)
      vm.subtractValues()
      vm.resolveAndCall("fib")
    },
    // 3: else (add & return)
    function(vm: Processor) {
      vm.addValues()
      vm.doReturn()
    }
  ];

  const fibBuilder = new CodeBuilder();
  for(const fibFn of fibFunctions) {
    fibBuilder.push(BC.CALL_TRANSPILED, fibFn);
  }
  const fibCode = fibBuilder.build();

  // Main program
  let mainBld = new CodeBuilder();
  let fibFuncDef = new FuncDef(["n"], fibCode);

  // Assign function to variable "fib"
  mainBld.push(BC.PUSH, fibFuncDef)
  mainBld.push(BC.ASSIGN_LOCAL, "fib")
  // `end function`

  // Call "fib"
  mainBld.push(BC.CALL_TRANSPILED, function(vm: Processor) {
    vm.pushValue(n)
    vm.resolveAndCall("fib")
  });

  mainBld.push(BC.CALL_TRANSPILED, function(vm: Processor) {
    vm.pushValue("Results:")
    vm.resolveAndCall("print")
  });
  mainBld.push(BC.CALL_TRANSPILED, function(vm: Processor) {
    vm.resolveAndCall("print")
  });

  mainBld.push(BC.EXIT)

  let mainPrg = mainBld.build();

  return mainPrg
}
