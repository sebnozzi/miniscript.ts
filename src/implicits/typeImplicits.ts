
function addBaseTypesImplicits(p: Processor) {

  const listImplicitNames = ["len", "indexOf"];
  const stringImplicitNames = ["len", "indexOf"];
  const mapImplicitNames = ["len", "indexOf"];

  const getFn = (name: string): BoundFunction => {
    const optFn = p.globalContext.getOpt(name);
    if (optFn) {
      return optFn;
    } else {
      throw new Error("Implicit not found: " + name);
    }
  };

  const importImplicits = (targetList: Map<any,any>, implicitNames: string[]) => {
    for (let fnName of implicitNames) {
      const boundFn = getFn(fnName);
      p.addCoreTypeImplicit(targetList, fnName, boundFn);
    }
  };

  importImplicits(p.listCoreType, listImplicitNames);
  importImplicits(p.mapCoreType, stringImplicitNames);
  importImplicits(p.stringCoreType, mapImplicitNames);

}