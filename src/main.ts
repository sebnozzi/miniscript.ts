/// <reference path="./vm/processor.ts"/>
/// <reference path="./implicits/implicits.ts"/>

const sampleCode = [
  "fib = function(n)",
  "  if n <= 1 then",
  "    return n",
  "  else",
  "    return fib(n-1) + fib(n-2)",
  "  end if",
  "end function",
  "print fib(30)"
].join("\n");

function runCompilerDemo() {
  const p = new Parser(sampleCode);
  const statements = p.parse();
  const compiler = new Compiler(statements);
  const code = compiler.compile();
  console.log(code);
  runCode(code);
}

function runDebugDemo() {
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
  
  const e = globalThis.editor;
  const savedPrg = loadProgram();
  if (savedPrg) {
    e.setValue(savedPrg);

  } else {
    e.setValue(sampleCode);
  }

  const p = new Parser(sampleCode);
  const statements = p.parse();
  const compiler = new Compiler(statements);
  const code = compiler.compile();
  console.log(code);
  debugCode(code);
}

function runParserDemo() {
  const p = new Parser(sampleCode);
  const statements = p.parse();
  console.log(statements);
  for(let statement of statements) {
    console.log(statement.toJson());
  }
}

function runTokenDemo() {
  const t = new Tokenizer(sampleCode);
  const tokens = t.tokenize();
  console.log(tokens);
  for(let token of tokens) {
    console.log(token.toString());
  }
}

function runCode(prgCode: Code) {
  console.log("Starting")

  let p = new Processor(prgCode);

  addImplicits(p);
  addGraphicImplicits(p);
  addPrintImplicit(p, (line: string) => {
    console.log(line);
  });

  let t0: number = performance.now();

  p.onFinished = function() {
    let t1 = performance.now();
    console.log("Finished")
    console.log(t1 - t0, " milliseconds");
  }
  
  p.run();
}

function compileAndRun() {
  const e = globalThis.editor;
  const srcCode = e.getValue();

  const p = new Parser(srcCode);
  const statements = p.parse();
  const compiler = new Compiler(statements);
  const code = compiler.compile();

  console.log("Compiled code:", code);
  // console.log(code);
  runCode(code);
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

function debugCode(prgCode: Code) {
  const e = globalThis.editor;

  let p = new Processor(prgCode);

  addImplicits(p);
  addGraphicImplicits(p);
  addPrintImplicit(p, (line: string) => {
    console.log(line);
  });
  
  p.onFinished = () => {
    console.log("DONE");
  }

  const enableButton = (button: HTMLButtonElement) => {
    button.removeAttribute("disabled");
  }

  const disableButton = (button: HTMLButtonElement) => {
    button.setAttribute("disabled", "true");
  }

  const d = new Debugger(p);

  const removeMarkers = () => {
    for(let id of Object.keys(e.session.getMarkers())) {
      e.session.removeMarker(id);
    }
  }

  const runBtn: HTMLButtonElement = document.getElementById("runBtn") as HTMLButtonElement;
  const stepOverBtn: HTMLButtonElement = document.getElementById("stepOverBtn") as HTMLButtonElement;
  const stepIntoBtn: HTMLButtonElement = document.getElementById("stepIntoBtn") as HTMLButtonElement;
  const stepOutBtn: HTMLButtonElement = document.getElementById("stepOutBtn") as HTMLButtonElement;

  d.onSrcChange = () => {
    const sme = d.getCurrentSrcMapEntry();

    if (sme != null) {
      removeMarkers();
      const Range = globalThis.ace.require("ace/range").Range;
      const srcLoc = sme.srcLoc;
      const srow = srcLoc.start.row - 1;
      const scol = srcLoc.start.col - 1;
      const erow = srcLoc.end.row - 1;
      const ecol = srcLoc.end.col - 1;
      //e.session.addMarker(new Range(srow, scol, erow, ecol), "blue", "text");
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
  }

  d.onFihished = () => {
    console.log("Finished");
    removeMarkers();
    disableButton(stepOverBtn);
    disableButton(stepIntoBtn);
    disableButton(stepOutBtn);
  };

  runBtn.addEventListener("click", () => {
    storeProgram();
    compileAndRun();
  });
  stepOverBtn.addEventListener("click", () => {
    d.stepOver();
  });
  stepIntoBtn.addEventListener("click", () => {
    d.stepInto();
  });
  stepOutBtn.addEventListener("click", () => {
    d.stepOut();
  });

  d.start();
}

