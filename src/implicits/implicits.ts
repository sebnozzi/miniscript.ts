

function addImplicits(p: Processor) {

  p.addGlobalImplicit("len", function(self: any): number | null {
    if (self instanceof Array || typeof self === "string") {
      return self.length;
    } else if (self instanceof Map) {
      return self.size;
    } else {
      return null;
    }
  });

  p.addGlobalImplicit("indexOf", function(self: any, value: any): number | null {
    if (self instanceof Array || typeof self === "string") {
      const idx = self.indexOf(value);
      return idx >= 0 ? idx : null;
    } else if (self instanceof Map) {
      for(let [key,mapValue] of self) {
        if (mapValue === value) {
          return key;
        }
      }
      return null;
    } else {
      return null;
    }
  });

  // str(value)
  p.addGlobalImplicit("str", function(value: any): string {
    const result: string = formatValue(value);
    return result;
  });

  // rnd
  p.addGlobalImplicit("rnd", function(): number {
    return Math.random();
  });

  // range(start,stop[,step])
  p.addGlobalImplicit("range", function(start: number, stop: number, step: number) {
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
