
function runCode(srcCode, onDone) {

  const parser = new Parser(srcCode);
  const statements = parser.parse();
  const compiler = new Compiler(statements);
  const code = compiler.compile();

  let vm = new Processor(code);
  let outLines = [];

  vm.addNative("print", 1, function(txt){
    console.log(txt);
    outLines.push(txt);
  });

  let t0 = performance.now();

  vm.onFinished = function() {
    let t1 = performance.now();
    console.log("Finished. Took: ", (t1 - t0), " milliseconds");
    onDone(outLines);
  }
  
  vm.run();
}

describe('VM', function () {
  describe('running code', function () {
    it('should run recursive fibonacci', function (done) {

      const fibNr = 15;
      const sampleCode = [
        "fib = function(n)",
        "  if n <= 1 then",
        "    return n",
        "  else",
        "    return fib(n-1) + fib(n-2)",
        "  end if",
        "end function",
        "print \"Result: \" + fib("+fibNr+")"
      ].join("\n");

      runCode(sampleCode, (lines) => {
        chai.assert.deepEqual(lines, ["Result: 610"]);
        done();
      });

    });
  });
});
