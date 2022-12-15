/// <reference path="../bytecodes.ts"/>
/// <reference path="../values.ts"/>
/*
def recur_fibo(n):
    if n <= 1:
        return n
    else:
        return recur_fibo(n - 1) + recur_fibo(n - 2)

*/
function fibProgram(n: number): Frame {

  // Build the "fib function"
  let fibBld = new CodeBuilder()
  fibBld.push(BC.PUSH_VAR, "n")
  fibBld.push(BC.PUSH, 1)
  fibBld.push_unresolved(BC.JUMP_GT, "else")
  // if part
  fibBld.push(BC.PUSH_VAR, "n")
  fibBld.push(BC.RETURN)
  // else part
  fibBld.define_address("else")
  fibBld.push(BC.PUSH_VAR, "n")
  fibBld.push(BC.SUBTR_N, 1)
  fibBld.push(BC.CALL, "fib")
  // When function returns, stack has return value
  fibBld.push(BC.PUSH_VAR, "n")
  fibBld.push(BC.SUBTR_N, 2)
  fibBld.push(BC.CALL, "fib")
  // Now stack has both return values, add them.
  // Leave value there, it is the return value.
  fibBld.push(BC.ADD_VALUES)
  fibBld.push(BC.RETURN)
  let fibCode = fibBld.build()

  // Main program
  let mainBld = new CodeBuilder();
  mainBld.push(BC.PUSH, n)
  mainBld.push(BC.CALL, "fib")
  mainBld.push(BC.PUSH, "Results: ")
  mainBld.push(BC.CALL_PRIMITIVE, "print")
  mainBld.push(BC.PRINT_TOP)
  mainBld.push(BC.EXIT)

  let mainPrg = mainBld.build();

  let globalContext = new Context();
  let fibFuncDef = new FuncDef(["n"], fibCode);
  globalContext.setLocal("fib", fibFuncDef);
  let initialFrame = new Frame(mainPrg, globalContext);

  return initialFrame
}