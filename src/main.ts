/// <reference path="./vm/processor.ts"/>
/// <reference path="./implicits/implicits.ts"/>

function setupIde() {
  const e = globalThis.editor;
  const savedPrg = loadProgram();
  // Restore previous code
  if (savedPrg) {
    e.setValue(savedPrg);
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
    e.setValue(sampleCode);
  }
  const runBtn: HTMLButtonElement = document.getElementById("runBtn") as HTMLButtonElement;
  runBtn.addEventListener("click", () => {
    storeProgram();
    compileAndRun();
  });
}

function compileAndRun() {
  
  const t0 = performance.now();

  const txtCallback = (txt: string) => {
    console.log(txt);
  };

  const interp = new Interpreter(txtCallback, txtCallback);
  
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

