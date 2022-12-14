/// <reference path="./bytecodes.ts"/>
/// <reference path="./context.ts"/>
/// <reference path="./code.ts"/>

class Frame {
  ip: number;
  code: Code;
  context: Context;

  constructor(code: Code) {
    this.ip = 0;
    this.code = code;
    this.context = new Context();
  }
}