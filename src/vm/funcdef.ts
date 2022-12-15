
class FuncDef {
  // TODO: support default values (at some point)
  // (or maybe not, this should be handled at the compiler level)
  params: string[];
  code: Code;

  constructor(params: string[], code: Code) {
    this.params = params;
    this.code = code;
  }
}
