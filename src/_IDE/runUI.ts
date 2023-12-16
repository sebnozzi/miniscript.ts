import { Interpreter } from "../interpreter/interpreter";
import { Code } from "../vm/code";
import { buildInterpreter, disableButton, enableButton, storeProgram } from "./ide";

export class RunUI {
  
  interp: Interpreter | null = null;
  stopBtn: HTMLButtonElement;
  runBtn: HTMLButtonElement;
  debugBtn: HTMLButtonElement;

  constructor() {
    this.stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;
    this.runBtn = document.getElementById("runBtn") as HTMLButtonElement;
    this.debugBtn = document.getElementById("stepOverBtn") as HTMLButtonElement;
  }

  setup() {
    this.runBtn.addEventListener("click", () => {
      storeProgram();
      this.runCode();
    });
  }

  runCode() {
  
    enableButton(this.stopBtn);
    disableButton(this.runBtn);
    disableButton(this.debugBtn);

    const t0 = performance.now();
  
    const interp = buildInterpreter();
    this.interp = interp;
  
    interp.onStarted = () => {
      console.log("Started Running.")
    }
    interp.onFinished = () => {
      const t1 = performance.now();
      this.interp = null;
      console.log("Finished Running.", t1 - t0, "ms");
      disableButton(this.stopBtn);
      enableButton(this.runBtn);
      enableButton(this.debugBtn);
    }
    interp.onCompiled = (code: Code) => {
      console.log("Compiled code:", code);
    }
  
    const e = globalThis.editor;
    const srcCode = e.getValue();
    interp.runSrcCode(srcCode);

    const canvas = document.getElementById("userEventLayer") as HTMLCanvasElement;
    canvas.focus();
  }

  stop() {
    if (this.interp) {
      this.interp.stopExecution();
    }
  }

}
