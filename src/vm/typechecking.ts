

function checkInt(arg: any, errorMsg: string, vm: Processor|null = null) {
  if (Number.isInteger(arg)) {
    return;
  } else if (vm instanceof Processor) {
    throw vm.runtimeError(errorMsg);
  } else {
    throw new RuntimeError(errorMsg);
  }
}


