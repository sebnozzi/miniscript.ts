/// <reference path="./bytecodes.ts"/>

class Code {

  opCodes: BC[];
  // For debugging
  debugLines: any[];
  
  arg1: any[];
  arg2: any[];

  srcMap: SourceMap;
  
  constructor() {
    this.opCodes = [];
    this.debugLines = [];
    this.arg1 = [];
    this.arg2 = [];
    this.srcMap = new SourceMap();
  }

  push(opCode: BC, arg1: any = null, arg2: any = null) {
    this.opCodes.push(opCode);
    this.arg1.push(arg1);
    this.arg2.push(arg2);
    this.pushDebugLine(opCode, arg1, arg2);
  }

  private pushDebugLine(opCode: BC, arg1: any, arg2: any) {
    const debugCode = [BC[opCode]];
    if (arg1) debugCode.push(arg1);
    if (arg2) debugCode.push(arg2);
    this.debugLines.push(debugCode);
  }

}