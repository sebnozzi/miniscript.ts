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

function run() {
  console.log("Starting")
  let t0 = performance.now();
  let prgCode = fibProgram(30);
  let p = new Processor(prgCode);

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