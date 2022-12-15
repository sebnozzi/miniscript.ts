/// <reference path="../bytecodes.ts"/>
/// <reference path="../values.ts"/>

function sumProgram(): Frame {
  let prg = new CodeBuilder()

  prg.push(BC.PUSH, 0)
  prg.push(BC.ASSIGN_LOCAL, 0) // assign to "i"
  prg.push(BC.PUSH, 0)
  prg.push(BC.ASSIGN_LOCAL, 1) // assign to "r"

  // (8) start_loop:
  prg.define_address("start_loop")
  prg.push(BC.PUSH_VAR, 0) // resolve "i"
  prg.push(BC.PUSH, 3_000_000)
  prg.push_unresolved(BC.JUMP_GE, "end_loop")

  // while body
  prg.push(BC.PUSH_VAR, 1) // resolve "r"
  prg.push(BC.ADD_N, 1)
  prg.push(BC.DIVIDE_N, 2)
  prg.push(BC.ASSIGN_LOCAL, 1) // assign "r"

  prg.push(BC.PUSH_VAR, 0) // resolve "i"
  prg.push(BC.ADD_N, 1)
  prg.push(BC.ASSIGN_LOCAL, 0) // assign "i"

  prg.push_unresolved(BC.JUMP, "start_loop")

  // (30) end_loop
  prg.define_address("end_loop")
  prg.push(BC.PUSH_VAR, 1) // push value of "r"
  prg.push(BC.PRINT_TOP)
  prg.push(BC.EXIT)

  let program = prg.build()
  let frame = new Frame(program)
  return frame
}