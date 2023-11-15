
function addBaseTypesImplicits(p: Processor) {

  const listImplicitNames = ["len", "indexOf", "indexes", "hasIndex", "sum"];
  const stringImplicitNames = ["len", "indexOf", "indexes", "hasIndex", "upper", "lower"];
  const mapImplicitNames = ["len", "indexOf", "indexes", "hasIndex", "sum"];

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
  importImplicits(p.mapCoreType, mapImplicitNames);
  importImplicits(p.stringCoreType, stringImplicitNames);

}