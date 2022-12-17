

function inlineCallFibProgram(n: number) {
  const fibFunctions = [
    // 0: pre if-block
    function(vm: Processor, context: Context, opStack: Stack<any>) {
      vm.resolveAndPush("n")
      vm.pushNumber(1)
      vm.compareLessEqual()
      vm.jumpIfFalse()
    },
    // 1: if block
    function(vm: Processor, context: Context, opStack: Stack<any>) {
      vm.resolveAndPush("n")
      vm.doReturn()
    },
    // 2: else (call 1)
    function(vm: Processor, context: Context, opStack: Stack<any>) {
      vm.resolveAndPush("n")
      vm.pushNumber(1)
      vm.subtractValues()
      vm.resolveAndCall("fib")
    },
    // 3: else (call 2)
    function(vm: Processor, context: Context, opStack: Stack<any>) {
      vm.resolveAndPush("n")
      vm.pushNumber(2)
      vm.subtractValues()
      vm.resolveAndCall("fib")
    },
    // 3: else (add & return)
    function(vm: Processor, context: Context, opStack: Stack<any>) {
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
  mainBld.push(BC.PUSH, n)
  mainBld.push(BC.CALL, "fib")

  mainBld.push(BC.PUSH, "Results: ")
  mainBld.push(BC.CALL_PRIMITIVE, "print")
  mainBld.push(BC.PRINT_TOP)
  mainBld.push(BC.EXIT)

  let mainPrg = mainBld.build();

  return mainPrg
}
