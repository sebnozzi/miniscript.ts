/// <reference path="./processor.ts"/>
/// <reference path="./sample_programs/sumProgram.ts"/>

function run() {
  console.log("Starting")
  let t0 = performance.now();
  let frame = fibProgram(30);
  let p = new Processor(frame);
  p.onFinished = function() {
    let t1 = performance.now();
    console.log("Finished")
    console.log(t1 - t0, " milliseconds");
  }
  p.run();
}