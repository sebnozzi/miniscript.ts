/// <reference path="./vm/processor.ts"/>
/// <reference path="./vm/sample_programs/sumProgram.ts"/>

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
    "    print n",
    "    return n",
    "  else",
    "    result = fib(n-1) + fib(n-2)",
    "    print result",
    "    return result",
    "  end if",
    "end function",
    "print fib(5)"
  ].join("\n");
  
  const e = globalThis.editor;
  e.setValue(sampleCode);

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

  p.addPrimitive("print", function(opStack: Stack<any>, context: Context){
    let arg = opStack.pop();
    console.log(arg);
  });

  let t0: number = performance.now();

  p.onFinished = function() {
    let t1 = performance.now();
    console.log("Finished")
    console.log(t1 - t0, " milliseconds");
  }
  
  p.run();
}

function runInlinedFib() {
  let prgCode = inlinedFibProgram(30);
  runCode(prgCode);
}

function runInlineCallFib() {
  let prgCode = inlineCallFibProgram(30);
  runCode(prgCode);
}

function debugCode(prgCode: Code) {
  console.log("Starting");
  const e = globalThis.editor;

  let p = new Processor(prgCode);

  p.addPrimitive("print", function(opStack: Stack<any>, context: Context){
    let arg = opStack.pop();
    console.log(arg);
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
  console.log(d);

  const removeMarkers = () => {
    for(let id of Object.keys(e.session.getMarkers())) {
      e.session.removeMarker(id);
    }
  }

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
  }

  d.onFihished = () => {
    console.log("Finished");
    removeMarkers();
    disableButton(stepOverBtn);
    disableButton(stepIntoBtn);
    disableButton(stepOutBtn);
  };

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

function run() {
  let prgCode = fibProgram(30);
  runCode(prgCode);
}
