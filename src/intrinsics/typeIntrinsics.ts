
function addBaseTypesIntrinsics(p: Processor) {

  const listIntrinsicNames = ["len", "indexOf", "indexes", "hasIndex", "sum",
    "sort", "push", "pull", "pop", "values", "insert", "remove", "replace",
    "join", "shuffle"];
  const stringIntrinsicNames = ["len", "indexOf", "indexes", "hasIndex", "upper", 
    "lower", "values", "insert", "remove", "replace", "split", "val"];
  const mapIntrinsicNames = ["len", "indexOf", "indexes", "hasIndex", "sum",
    "push", "pull", "pop", "values", "remove", "replace", "shuffle"];

  const getFn = (name: string): BoundFunction => {
    const optFn = p.globalContext.getOpt(name);
    if (optFn !== undefined) {
      return optFn;
    } else {
      throw new Error("Intrinsic not found: " + name);
    }
  };

  const importIntrinsics = (targetList: HashMap, intrinsicNames: string[]) => {
    for (let fnName of intrinsicNames) {
      const boundFn = getFn(fnName);
      p.addCoreTypeIntrinsic(targetList, fnName, boundFn);
    }
  };

  importIntrinsics(p.listCoreType, listIntrinsicNames);
  importIntrinsics(p.mapCoreType, mapIntrinsicNames);
  importIntrinsics(p.stringCoreType, stringIntrinsicNames);

}