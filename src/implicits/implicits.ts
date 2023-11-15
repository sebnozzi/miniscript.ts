

function addImplicits(p: Processor) {

  p.addGlobalImplicit("len(self)", function(self: any): number | null {
    if (self instanceof Array || typeof self === "string") {
      return self.length;
    } else if (self instanceof Map) {
      return self.size;
    } else {
      return null;
    }
  });

  p.addGlobalImplicit("sum(self)", function(self: any): number {
    let list;
    if (self instanceof Array) {
      list = self as Array<any>;
    } else if (self instanceof Map) {
      list = Array.from( self.values() );
    } else {
      return 0;
    }
    let total = 0;
    for (let e of list) {
      total += toNumberValue(e);
    }
    return total;
  });

  p.addGlobalImplicit("indexOf(self,value,after=null)", function(self: any, value: any, after: number | null): number | null {
    if (self instanceof Array || typeof self === "string") {
      let afterIdx = after !== null ? after : 0;
      const idx = self.indexOf(value, afterIdx);
      return idx >= 0 ? idx : null;
    } else if (self instanceof Map && after === null) {
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

  p.addGlobalImplicit("hasIndex(self,index)", function(self: any, index: any): number | null {
    if (self instanceof Map) {
      return self.has(index) ? 1 : 0;
    } else if (self instanceof Array || typeof self === "string") {
      if (typeof index === "number" && self.length > 0) {
        return index >= 0 && index < self.length ? 1 : 0;
      } else {
        return 0;
      }
    } else {
      return null;
    }
  });

  p.addGlobalImplicit("indexes(self)", function(self: any): any[] | null {
    if (self instanceof Map) {
      const keys = Array.from( self.keys() );
      return keys;
    } else if (self instanceof Array || typeof self === "string") {
      const indexes = [];
      for (let i = 0; i < self.length; i++) {
        indexes.push(i);
      }
      return indexes;
    } else {
      return null;
    }
  });

  p.addGlobalImplicit("str(self)", function(value: any): string {
    const result: string = formatValue(value);
    return result;
  });

  p.addGlobalImplicit("rnd", function(): number {
    return Math.random();
  });

  p.addGlobalImplicit("abs(x)", function(x: any): number {
    if (typeof x === "number") {
      return Math.abs(x);
    } else {
      return 0;
    }
  });

  p.addGlobalImplicit("upper(self)", function(value: any): string | any {
    if (typeof value === "string") {
      return value.toUpperCase();
    } else {
      return value;
    }
  });

  p.addGlobalImplicit("lower(self)", function(value: any): string | any {
    if (typeof value === "string") {
      return value.toLowerCase();
    } else {
      return value;
    }
  });

  // range(start,stop[,step])
  p.addGlobalImplicit("range(start,stop,step=null)", function(start: number, stop: number, step: number) {
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
  });

}
