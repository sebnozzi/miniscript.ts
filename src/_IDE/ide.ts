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
  const stepIntoBtn = document.getElementById("stepIntoBtn") as HTMLButtonElement;
  const stepOutBtn = document.getElementById("stepOutBtn") as HTMLButtonElement;
  const stopBtn = document.getElementById("stopBtn") as HTMLButtonElement;

  disableButton(stepIntoBtn);
  disableButton(stepOutBtn);
  disableButton(stopBtn);

  const debugUi = new DebugUI();
  debugUi.setup();

  const runUI = new RunUI();
  runUI.setup();

  stopBtn.addEventListener("click", () => {
    runUI.stop();
    debugUi.stop();
  });

}

function buildInterpreter(): Interpreter {
  const txtCallback = (txt: string) => { console.log(txt); };
  const interp = new DemoInterpreter(txtCallback, txtCallback);
  return interp;
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

