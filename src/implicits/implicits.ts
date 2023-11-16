

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
    let list: any[];
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
      const indexes: number[] = [];
      for (let i = 0; i < self.length; i++) {
        indexes.push(i);
      }
      return indexes;
    } else {
      return null;
    }
  });

  p.addGlobalImplicit("sort(self,byKey=null,ascending=1)", 
    function(self: any, byKey: any | null, ascending: any): any {
      type KeyedValue = {
        sortKey: any,
        value: any
      };
      const compareSameType = (a: any, b: any): -1|0|1 => {
        if (a < b) {
          return -1;
        } else if (a > b) {
          return 1;
        } else {
          return 0;
        }
      };
      const compareByValues = (a: any, b: any): -1|0|1 => {
        // Put "null" values at the end
        if (a === null) {
          if (b === null) {
            return 0;
          } else {
            return 1;
          }
        }
        if (b === null) {
          return -1;
        }
        // Do string-comparison if any argument is a string
        if (typeof a === "string" || typeof b === "string") {
          const aStr = toString(a);
          const bStr = toString(b);
          return compareSameType(aStr, bStr);
        }
        // Do numeric comparison if both arguments are numbers
        if (typeof a === "number" && typeof b === "number") {
          return compareSameType(a, b);
        }
        // Otherwise consider them equal
        return 0;
      };
      const compareByKeys = (a: KeyedValue, b: KeyedValue): -1|0|1 => {
        return compareByValues(a.sortKey, b.sortKey);
      };

      if (!(self instanceof Array)) {
        return self;
      }

      if (self.length < 2) {
        return self;
      }

      const copied = self.slice();
      let sorted: any[];

      if (byKey === null) {
        sorted = copied.sort(compareByValues);
      } else {
        // Sort by key
        const intKey = toIntegerValue(byKey);
        const keyedList: KeyedValue[] = [];
        // Build list of keyed-values
        for (let i = 0; i < self.length; i++) {
          const value = self[i];
          let sortKey: any = null;
          if (value instanceof Map) {
            sortKey = p.mapAccessOpt(value, byKey) || null;
          } else if (value instanceof Array) {
            if (intKey > -value.length && intKey < value.length) {
              const normalizedIdx = intKey % value.length;
              sortKey = value[normalizedIdx];
            }
          }
          const keyedValue = {
            sortKey: sortKey,
            value: value
          };
          keyedList.push(keyedValue);
        }
        // Sort list of keyed-values (in-place)
        keyedList.sort(compareByKeys);
        // Extract values to build a values-only (sorted) list
        sorted = [];
        for (let keyedValue of keyedList) {
          sorted.push(keyedValue.value);
        }
      }

      if (toBooleanNr(ascending) === 0) {
        sorted.reverse();
      }

      return sorted;
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
