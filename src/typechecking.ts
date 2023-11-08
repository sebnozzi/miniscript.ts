

function checkInt(arg: any, errorMsg: string) {
  if (Number.isInteger(arg)) {
    return;
  } else {
    throw new Error(errorMsg);
  }
}

// TODO: support also Maps
// Return the effectiveIndex
function checkAccessTarget(accessTarget: any, index: any): number {
  // Check access target type
  const validTarget = accessTarget instanceof Array;
  if (!validTarget) {
    throw new Error("Access target must be a List");
  }
  // Check index type
  checkInt(index, "Index must be integer");
  // Compute effective index
  const effectiveIndex = computeEffectiveIndex(accessTarget, index);
  return effectiveIndex;
}

