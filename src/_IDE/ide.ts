/// <reference types="ace" />

import { getEditor } from "..";
import { Interpreter } from "../interpreter/interpreter";
import { DebugUI } from "./debugUI";
import { MMLikeInterpreter } from "./MMLikeAPIs/MMLikeInterpreter";
import { RunUI } from "./runUI";

export function setupIde() {
  const e: AceAjax.Editor = getEditor();
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

export function buildInterpreter(): Interpreter {
  const txtCallback = (txt: string) => { console.log(txt); };
  const interp = new MMLikeInterpreter(txtCallback, txtCallback);
  return interp;
}

export function storeProgram() {
  const e = getEditor();
  const srcCode = e.getValue();
  const storage = window.localStorage;
  storage.setItem("code", srcCode);
}

export function loadProgram() {
  const storage = window.localStorage;
  const code = storage.getItem("code");
  return code;
}

export function clr() {
  const storage = window.localStorage;
  storage.clear();
}

export function enableButton(button: HTMLButtonElement) {
  button.removeAttribute("disabled");
}

export function setButtonLabel(button: HTMLButtonElement, label: string) {
  button.textContent = label;
}

export function disableButton(button: HTMLButtonElement) {
  button.setAttribute("disabled", "true");
}

export function removeMarkers(aceEditor: any) {
  for(let id of Object.keys(aceEditor.session.getMarkers())) {
    aceEditor.session.removeMarker(id);
  }
}

