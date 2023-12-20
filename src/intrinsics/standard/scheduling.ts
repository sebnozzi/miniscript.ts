import { Processor } from "../../vm/processor";
import { toNumberValue } from "../../vm/runtime";

export function addSchedulingIntrinsics(p: Processor) {

  p.addIntrinsic("time", 
  function(): number {
    const t0 = p.executionStartTime;
    const t1 = performance.now();
    return (t1 - t0) / 1000.0;
  });

  p.addIntrinsic("wait(seconds=1.0)", 
  function(seconds: number): Promise<any> {
    seconds = toNumberValue(seconds);
    const milliseconds = seconds * 1000;
    return new Promise<any>((resolve) => {
      // Resolve promise after amount of seconds
      setTimeout(() => {
        resolve(null);
      }, milliseconds);
    });
  });

  p.addIntrinsic("yield", 
  function(): any {
    p.yieldExecution();
  });

  p.addIntrinsic("run",
  function() {
    p.restartProgram();
    return p.abortCallValue;
  });

  p.addIntrinsic("exit",
  function() {
    p.stopRunning();
    return p.abortCallValue;
  })
  
}