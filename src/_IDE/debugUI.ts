class DebugUI {


  private stepOverBtn: HTMLButtonElement;
  private stepIntoBtn: HTMLButtonElement;
  private stepOutBtn: HTMLButtonElement;
  private editor: any;
  private _d: Debugger | null = null;
  private stopBtn: HTMLButtonElement;

  constructor() {
    this.stepOverBtn = document.getElementById("stepOverBtn") as HTMLButtonElement;
    this.stepIntoBtn = document.getElementById("stepIntoBtn") as HTMLButtonElement;
    this.stepOutBtn = document.getElementById("stepOutBtn") as HTMLButtonElement;
    this.stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;

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
    enableButton(this.stopBtn);

    const interp = buildInterpreter();

    interp.onCompiled = (code: Code) => {
      console.log("Compiled code:", code);
    }

    const callbacks = this.makeCallbacks();
  
    const srcCode = this.editor.getValue();
    this._d = interp.debugSrcCode(srcCode, callbacks);
  }

  stop() {
    if (this._d) {
      this._d.stop();
      this.finish();
    }
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
      disableButton(this.stopBtn);
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