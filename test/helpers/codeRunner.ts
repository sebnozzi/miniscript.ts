import { Interpreter } from "../../src/interpreter/interpreter";

export function runCode(srcCode: string, testName: string): Promise<string[]> {

  const outLines: string[] = [];
  const txtCallback = (line: string) => {
    outLines.push(""+line);
  }
  const interp = new Interpreter(txtCallback, txtCallback);

  const runPromise = new Promise<string[]>((resolve) => {
    const t0 = performance.now();
    interp.onFinished = function() {
      const t1 = performance.now();
      console.log("Finished in", (t1 - t0), "ms: ", testName);
      resolve(outLines);
    }
    
    interp.runSrcCode(srcCode);  
  });

  return runPromise;
}