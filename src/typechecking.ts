

function checkInt(arg: any, errorMsg: string) {
  if (Number.isInteger(arg)) {
    return;
  } else {
    throw new RuntimeError(errorMsg);
  }
}


