
function addImplicits(p: Processor) {

  // str(value)
  p.addNative("str", function(value: any): string {
    const result: string = formatValue(value);
    return result;
  });

  // rnd
  p.addNative("rnd", function(): number {
    return Math.random();
  });

  // range(start,stop[,step])
  p.addNative("range", function(start: number, stop: number, step: number) {
    checkInt(start, "Argument 'start' should be integer");
    checkInt(stop, "Argument 'stop' should be integer");

    const result: number[] = [];

    if (start < stop) {
      step = step === null ? 1 : step;
      checkInt(step, "Argument 'step' should be integer");
      if (step < 1) {
        throw new Error("Argument 'step' should be a positive number in this case");
      }
      for (let i = start; i <= stop; i += step) {
        result.push(i);
      }
    } else {
      step = step === null ? -1 : step;
      checkInt(step, "Argument 'step' should be integer");
      if (step >= 0) {
        throw new Error("Argument 'step' should be a negative number in this case");
      }
      for (let i = start; i >= stop; i += step) {
        result.push(i);
      }
    }

    return result;
  }, [undefined, undefined, null]);

}
