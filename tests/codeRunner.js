function runCode(srcCode, testName, onDone) {

  const parser = new Parser(srcCode);
  const statements = parser.parse();
  const compiler = new Compiler(statements);
  const code = compiler.compile();

  let vm = new Processor(code);
  let outLines = [];

  vm.addNative("print", 1, function(txt){
    console.log(""+txt);
    outLines.push(""+txt);
  });

  let t0 = performance.now();

  vm.onFinished = function() {
    let t1 = performance.now();
    console.log("Finished in", (t1 - t0), "ms: ", testName);
    onDone(outLines);
  }
  
  vm.run();
}