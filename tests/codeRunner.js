function runCode(srcCode, testName, onDone) {

  let outLines = [];
  let txtCallback = (line) => {
    outLines.push(""+line);
  }
  const interp = new Interpreter(txtCallback, txtCallback);

  const t0 = performance.now();
  interp.onFinished = function() {
    const t1 = performance.now();
    console.log("Finished in", (t1 - t0), "ms: ", testName);
    onDone(outLines);
  }
  
  interp.runSrcCode(srcCode);  
}