
function addSchedulingIntrinsics(p: Processor) {

  p.addGlobalIntrinsic("time", 
  function(): number {
    const t0 = p.executionStartTime;
    const t1 = performance.now();
    return (t1 - t0) / 1000.0;
  });

  p.addGlobalIntrinsic("wait(seconds=1.0)", 
  function(seconds: number): Promise<any> {
    seconds = toNumberValue(seconds);
    const milliseconds = seconds * 1000;
    return new Promise<any>((resolve, reject) => {
      // Resolve promise after amount of seconds
      setTimeout(() => {
        resolve(null);
      }, milliseconds);
    });
  });

  p.addGlobalIntrinsic("yield", 
  function(): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      setTimeout(() => {
        resolve(null);
      }, 0);
    });
  });
  
}