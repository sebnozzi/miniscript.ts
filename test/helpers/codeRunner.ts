import { Interpreter } from "../../src/interpreter/interpreter";

export function runCode(srcCode: string, testName: string): Promise<string[]> {

  const outLines: string[] = [];
  const txtCallback = (line: string) => {
    outLines.push(""+line);
  }
  const interp = new Interpreter(txtCallback, txtCallback);

  const runPromise = new Promise<string[]>(async (resolve) => {
    const t0 = performance.now();
    
    const runner = interp.getCooperativeRunner(srcCode);
    if (runner) {
      const runCoopPromise = new Promise<void>(resolve => {
        const loopFn = () => {
          if(!runner.isFinished()) {
            runner.runSomeCycles();
            setTimeout(() => { loopFn() }, 0);
          } else {
            resolve();
          }
        }
        loopFn();
      });
      await runCoopPromise;
    }

    const t1 = performance.now();
    console.log("Finished in", (t1 - t0), "ms: ", testName);
    resolve(outLines);
  });

  return runPromise;
}