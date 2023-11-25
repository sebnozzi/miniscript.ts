/// <reference path="../vm/processor.ts"/>
/// <reference path="../intrinsics/intrinsics.ts"/>

class DebugUI {

  private stepOverBtn: HTMLButtonElement;
  private stepIntoBtn: HTMLButtonElement;
  private stepOutBtn: HTMLButtonElement;
  private editor: any;
  private _d: Debugger | null = null;

  constructor() {
    this.stepOverBtn = document.getElementById("stepOverBtn") as HTMLButtonElement;
    this.stepIntoBtn = document.getElementById("stepIntoBtn") as HTMLButtonElement;
    this.stepOutBtn = document.getElementById("stepOutBtn") as HTMLButtonElement;
    this.editor = globalThis.editor;
  }

  setup() {
    this.stepOverBtn.addEventListener("click", () => {
      this.debugOrStepOver();
    });
    this.stepIntoBtn.addEventListener("click", () => {
      this.stepInto();
    });
    this.stepOutBtn.addEventListener("click", () => {
      this.stepOut();
    });
  }

  debugger(): Debugger {
    if (this._d === null) {
      throw new Error("Debugger not initialized");
    }
    return this._d;
  }

  debugOrStepOver() {
    if (this._d === null) {
      this.start();
    } else {
      this.stepOver();
    }
  }

  start() {
    setButtonLabel(this.stepOverBtn, "Step Over ");

    const interp = buildInterpreter();

    interp.onCompiled = (code: Code) => {
      console.log("Compiled code:", code);
    }

    const callbacks = this.makeCallbacks();
  
    const srcCode = this.editor.getValue();
    this._d = interp.debugSrcCode(srcCode, callbacks);
  }

  finish() {
    console.log("Finished");
    this._d = null;
    removeMarkers(this.editor);
    setTimeout(() => {
      enableButton(this.stepOverBtn);
      setButtonLabel(this.stepOverBtn, "Debug");
      disableButton(this.stepIntoBtn);
      disableButton(this.stepOutBtn);
    }, 0);
  }

  stepOver() {
    this.debugger().stepOver();
  }
  
  stepInto() {
    this.debugger().stepInto();
  }

  stepOut() {
    this.debugger().stepOut();
  }

  makeCallbacks(): DebuggerCallbacks {
    const outerThis = this;

    const onSrcChange = (d: Debugger):void => {

      const sme = d.getCurrentSrcMapEntry();

      if (sme != null) {
        removeMarkers(this.editor);
        const Range = globalThis.ace.require("ace/range").Range;
        const srcLoc = sme.srcLoc;
        const srow = srcLoc.start.row - 1;
        outerThis.editor.session.addMarker(new Range(srow, 0, srow, 500), "blue", "text");
      }

      if (d.canStepIn()) {
        enableButton(outerThis.stepIntoBtn);
      } else {
        disableButton(outerThis.stepIntoBtn);
      }

      if (d.canStepOut()) {
        enableButton(outerThis.stepOutBtn);
      } else {
        disableButton(outerThis.stepOutBtn);
      }
    };

    const onFinished = (_: Debugger):void => {
      outerThis.finish();
    };

    const callbacks: DebuggerCallbacks = {
      onSrcChange: onSrcChange,
      onFinished: onFinished
    }

    return callbacks;
  }

}

function setupIde() {
  const e = globalThis.editor;
  const savedPrg = loadProgram();
  // Restore previous code
  if (savedPrg) {
    e.setValue(savedPrg, -1);
  } else {
    const sampleCode = [
      "fib = function(n)",
      "  if n <= 1 then",
      "    return n",
      "  else",
      "    result = fib(n-1) + fib(n-2)",
      "    return result",
      "  end if",
      "end function",
      "print fib(5)"
    ].join("\n");
    e.setValue(sampleCode, -1);
  }

  const runBtn = document.getElementById("runBtn") as HTMLButtonElement;
  const stepIntoBtn = document.getElementById("stepIntoBtn") as HTMLButtonElement;
  const stepOutBtn = document.getElementById("stepOutBtn") as HTMLButtonElement;

  disableButton(stepIntoBtn);
  disableButton(stepOutBtn);

  const debugUi = new DebugUI();
  debugUi.setup();

  runBtn.addEventListener("click", () => {
    storeProgram();
    runCode();
  });

}

function buildInterpreter(): Interpreter {
  const txtCallback = (txt: string) => { console.log(txt); };
  const interp = new Interpreter(txtCallback, txtCallback);
  return interp;
}

function runCode() {
  
  const t0 = performance.now();

  const interp = buildInterpreter();

  interp.onStarted = () => {
    console.log("Starting")
  }
  interp.onFinished = () => {
    const t1 = performance.now();
    console.log("Finished.", t1 - t0, "ms");
  }
  interp.onCompiled = (code: Code) => {
    console.log("Compiled code:", code);
  }

  const e = globalThis.editor;
  const srcCode = e.getValue();
  interp.runSrcCode(srcCode);  
}

function storeProgram() {
  const e = globalThis.editor;
  const srcCode = e.getValue();
  const storage = window.localStorage;
  storage.setItem("code", srcCode);
}

function loadProgram() {
  const storage = window.localStorage;
  const code = storage.getItem("code");
  return code;
}

function clr() {
  const storage = window.localStorage;
  storage.clear();
}

function enableButton(button: HTMLButtonElement) {
  button.removeAttribute("disabled");
}

function setButtonLabel(button: HTMLButtonElement, label: string) {
  button.textContent = label;
}

function disableButton(button: HTMLButtonElement) {
  button.setAttribute("disabled", "true");
}

function removeMarkers(aceEditor: any) {
  for(let id of Object.keys(aceEditor.session.getMarkers())) {
    aceEditor.session.removeMarker(id);
  }
}

