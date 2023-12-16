import { BC } from "./bytecodes";
import { SourceMap } from "./sourcemap";

export class Code {

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

  push(opCode: BC, arg1: any = undefined, arg2: any = undefined) {
    this.opCodes.push(opCode);
    this.arg1.push(arg1);
    this.arg2.push(arg2);
    this.pushDebugLine(opCode, arg1, arg2);
  }

  private pushDebugLine(opCode: BC, arg1: any, arg2: any) {
    const debugCode = [BC[opCode]];
    if (arg1 !== undefined) debugCode.push(arg1);
    if (arg2 !== undefined) debugCode.push(arg2);
    this.debugLines.push(debugCode);
  }

}