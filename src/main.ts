/// <reference path="./vm/processor.ts"/>
/// <reference path="./vm/sample_programs/sumProgram.ts"/>

function run() {
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
  const t = new Tokenizer(sampleCode);
  const tokens = t.tokenize();
  console.log(tokens);
  for(let token of tokens) {
    console.log(token.toString());
  }
}

function runVmDemo() {
  console.log("Starting")
  let t0 = performance.now();
  let frame = fibProgram(30);
  let p = new Processor(frame);

  p.addPrimitive("print", function(opStack: Stack<any>, context: Context){
    let arg = opStack.pop();
    console.log(arg);
  });

  p.onFinished = function() {
    let t1 = performance.now();
    console.log("Finished")
    console.log(t1 - t0, " milliseconds");
  }
  p.run();
}