/// <reference path="../vm/processor.ts"/>
/// <reference path="../intrinsics/intrinsics.ts"/>

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
  const stepOverBtn = document.getElementById("stepOverBtn") as HTMLButtonElement;
  const stepIntoBtn = document.getElementById("stepIntoBtn") as HTMLButtonElement;
  const stepOutBtn = document.getElementById("stepOutBtn") as HTMLButtonElement;

  disableButton(stepIntoBtn);
  disableButton(stepOutBtn);

  const txtCallback = (txt: string) => {
    console.log(txt);
  };

  const interp = new Interpreter(txtCallback, txtCallback);
  let optDebugger: Debugger | null = null;
  let debugging = false;

  runBtn.addEventListener("click", () => {
    storeProgram();
    runCode(interp);
  });
  stepOverBtn.addEventListener("click", () => {
    if(!debugging) {
      // Start debugging session
      debugging = true;
      // Setup callbacks
      const onSrcChange = (d: Debugger):void => {
        const sme = d.getCurrentSrcMapEntry();

        let start = "";
        let stop = "";
        if (sme !== null) {
          start = `[line ${sme.srcLoc.start.row}, col ${sme.srcLoc.start.col}]`;
          stop = `[line ${sme.srcLoc.end.row}, col ${sme.srcLoc.end.col}]`;
        }
        //console.log(`Source code location changed: from ${start} to ${stop}`);

        if (sme != null) {
          removeMarkers(e);
          const Range = globalThis.ace.require("ace/range").Range;
          const srcLoc = sme.srcLoc;
          const srow = srcLoc.start.row - 1;
          const scol = srcLoc.start.col - 1;
          const erow = srcLoc.end.row - 1;
          const ecol = srcLoc.end.col - 1;
          e.session.addMarker(new Range(srow, scol, erow, ecol), "blue", "text");
        }

        if (d.canStepIn()) {
          enableButton(stepIntoBtn);
        } else {
          disableButton(stepIntoBtn);
        }

        if (d.canStepOut()) {
          enableButton(stepOutBtn);
        } else {
          disableButton(stepOutBtn);
        }
      };
      const onFinished = (d: Debugger):void => {
        console.log("Finished");
        debugging = false;
        removeMarkers(e);
        enableButton(stepOverBtn);
        setButtonLabel(stepOverBtn, "Debug");
        disableButton(stepIntoBtn);
        disableButton(stepOutBtn);
      };
      const callbacks: DebuggerCallbacks = {
        onSrcChange: onSrcChange,
        onFinished: onFinished
      }

      const d: Debugger | null = startDebugging(interp, callbacks);
      if (d) {
        optDebugger = d;
        setButtonLabel(stepOverBtn, "Step Over");
        stepIntoBtn.addEventListener("click", () => {
          d.stepInto();
        });
        stepOutBtn.addEventListener("click", () => {
          d.stepOut();
        });
      }
    } else {
      optDebugger?.stepOver();
    }
  });
}

function runCode(interp: Interpreter) {
  
  const t0 = performance.now();

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

function startDebugging(interp: Interpreter, callbacks: DebuggerCallbacks): Debugger | null {
  
  interp.onCompiled = (code: Code) => {
    console.log("Compiled code:", code);
  }

  const e = globalThis.editor;
  const srcCode = e.getValue();
  const d = interp.debugSrcCode(srcCode, callbacks);

  return d;
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

