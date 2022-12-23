/// <reference path="./bytecodes.ts"/>

class Code {

  opCodes: BC[];
  arg1: any[];
  arg2: any[];
  srcMap: SourceMap;

  constructor() {
    this.opCodes = [];
    this.arg1 = [];
    this.arg2 = [];
    this.srcMap = new SourceMap();
  }

  push(opCode: BC, arg1: any = null, arg2: any = null) {
    this.opCodes.push(opCode)
    this.arg1.push(arg1)
    this.arg2.push(arg2)
  }

}