

function checkInt(arg: any, errorMsg: string) {
  if (Number.isInteger(arg)) {
    return;
  } else {
    throw new Error(errorMsg);
  }
}

// TODO: support also Maps
// Returns the effectiveIndex
function checkAccessTarget(accessTarget: any, index: any): number {
  // Check access target type
  const validTarget = accessTarget instanceof Array || typeof accessTarget === "string";
  if (!validTarget) {
    throw new Error("Access target must be a List or String");
  }
  // Check index type
  checkInt(index, "Index must be an integer");
  // Compute effective index
  const effectiveIndex = computeEffectiveIndex(accessTarget, index);
  return effectiveIndex;
}

