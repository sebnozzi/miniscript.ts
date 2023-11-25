/// <reference path="../interpreter/interpreter.ts"/>

class DemoInterpreter extends Interpreter {

  constructor(stdoutCallback: TxtCallback, stderrCallback: TxtCallback) {
      super(stdoutCallback,stderrCallback);
      addCanvasIntrinsics(this.vm);
  }

}