/// <reference path="./bytecodes.ts"/>
/// <reference path="./context.ts"/>
/// <reference path="./code.ts"/>

class Frame {
  ip: number;
  code: Code;
  context: Context;

  constructor(code: Code, context: Context | undefined = undefined) {
    this.ip = 0;
    this.code = code;
    if (context) {
      this.context = context;
    } else {
      this.context = new Context();
    }
  }
}