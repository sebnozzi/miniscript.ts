

function inlinedFibProgram(n: number) {
  const fibFunctions = [
    // 0: pre if-block
    function(vm: Processor) {
      // resolve and push "n"
      {
        const value = vm.context.get("n")
        vm.opStack.push(value)
      }
      // push constant 1
      {
        vm.opStack.push(1)
      }
      // compare less-or-equal
      {
        let valueB = vm.opStack.pop()
        let valueA = vm.opStack.pop()
        if (lessEquals(valueA, valueB)) {
          vm.opStack.push(1)
        } else {
          vm.opStack.push(0)
        }
      }
      // jump if result false
      {
        let value = vm.opStack.pop()
        if (value == 0) {
          vm.ip = 2
        } else {
          vm.ip ++;
        }
      }
    },
    // 1: if block
    function(vm: Processor) {
      // resolve and push "n"
      {
        const value = vm.context.get("n")
        vm.opStack.push(value)
      }
      // return
      {
        vm.popFrame();
      }
    },
    // 2: else (call 1)
    function(vm: Processor) {
      // resolve and push "n"
      {
        const value = vm.context.get("n")
        vm.opStack.push(value)
      }
      // push constant 1
      {
        vm.opStack.push(1)
      }
      // subtract values
      {
        let valueInStack_2 = vm.opStack.pop()
        let valueInStack_1 = vm.opStack.pop()
        let result = subtract(valueInStack_1, valueInStack_2)
        vm.opStack.push(result)
      }
      // call "fib"
      {
        let funcName = "fib"
        let funcDef: FuncDef = vm.context.get(funcName);
      
        // Let it return to the next bytecode after the call
        vm.ip += 1;
        vm.pushFrame();
    
        vm.code = funcDef.code;
        vm.context = new Context(vm.globalContext);
        vm.ip = 0;
    
        // Pop and set parameters as variables
        for (let paramName of funcDef.params) {
          const paramValue = vm.opStack.pop();
          vm.context.setLocal(paramName, paramValue);
        }
      }
    },
    // 3: else (call 2)
    function(vm: Processor) {
      // resolve and push "n"
      {
        const value = vm.context.get("n")
        vm.opStack.push(value)
      }
      // push constant 2
      {
        vm.opStack.push(2)
      }
      // subtract values
      {
        let valueInStack_2 = vm.opStack.pop()
        let valueInStack_1 = vm.opStack.pop()
        let result = subtract(valueInStack_1, valueInStack_2)
        vm.opStack.push(result)
      }
      // call "fib"
      {
        let funcName = "fib"
        let funcDef: FuncDef = vm.context.get(funcName);
      
        // Let it return to the next bytecode after the call
        vm.ip += 1;
        vm.pushFrame();
    
        vm.code = funcDef.code;
        vm.context = new Context(vm.globalContext);
        vm.ip = 0;
    
        // Pop and set parameters as variables
        for (let paramName of funcDef.params) {
          const paramValue = vm.opStack.pop();
          vm.context.setLocal(paramName, paramValue);
        }
      }
    },
    // 3: else (add & return)
    function(vm: Processor) {
      // add
      {
        let valueInStack_1 = vm.opStack.pop()
        let valueInStack_2 = vm.opStack.pop()
        let result = add(valueInStack_1, valueInStack_2)
        vm.opStack.push(result)
      }
      // return
      {
        vm.popFrame();
      }
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
