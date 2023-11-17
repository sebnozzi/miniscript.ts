

function addIntrinsics(p: Processor) {

  p.addGlobalIntrinsic("len(self)", function(self: any): number | null {
    if (self instanceof Array || typeof self === "string") {
      return self.length;
    } else if (self instanceof Map) {
      return self.size;
    } else {
      return null;
    }
  });

  p.addGlobalIntrinsic("sum(self)", function(self: any): number {
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

  p.addGlobalIntrinsic("floor(n)", function(n: any): number {
    if (typeof n === "number") {
      return Math.floor(n);
    } else {
      return 0;
    }
  });

  p.addGlobalIntrinsic("ceil(n)", function(n: any): number {
    if (typeof n === "number") {
      return Math.ceil(n);
    } else {
      return 0;
    }
  });

  p.addGlobalIntrinsic("round(n,decimalPlaces=0)", function(n: any, decimalPlaces: any): number {
    if (typeof n === "number" && typeof decimalPlaces === "number") {
      if (decimalPlaces >= 0) {
        const places = Math.pow(10, decimalPlaces);      
        return Math.round(n * places) / places;
      } else {
        const pow10Nr = Math.pow(10, -decimalPlaces);
        return Math.round(n / pow10Nr) * pow10Nr;
      }
    } else {
      return 0;
    }
  });

  p.addGlobalIntrinsic("sign(n)", function(n: any): number {
    if (typeof n === "number") {
      if (n > 0) {
        return 1;
      } else if (n < 0) {
        return -1;
      }
    }
    return 0;
  });

  // Try to convert to a number
  p.addGlobalIntrinsic("val(x)", function(x: any): number | null {
    if (typeof x === "number") {
      return x;
    } else if (typeof x === "string") {
      let result: number = Number(x);
      if (isNaN(result)) {
        return 0;
      } else {
        return result;
      }
    } else {
      return null;
    }
  });

  p.addGlobalIntrinsic("code(x)", function(x: any): number | null {
    if (x !== null) {
      const s = toString(x);
      if (x === "") {
        return null
      }
      const result = s.charCodeAt(0);
      return result;
    } else {
      return 0;
    }
  });

  p.addGlobalIntrinsic("char(n)", function(x: any): string {
    if (typeof x === "number" && x > 0) {
      const s = String.fromCharCode(x)
      return s;
    }
    return String.fromCharCode(0);
  });

  p.addGlobalIntrinsic("insert(self,index,value)", function(self: any, index: number, value: any): any | null {
    if (index === null) {
      throw new RuntimeError("index argument required");
    }
    if (typeof index !== "number") {
      throw new RuntimeError("number required for index argument");
    }
    index = toIntegerValue(index);
    if (index < 0) {
      index += self.length + 1;
    }
    checkRange(index, 0, self.length);
    if (self instanceof Array) {
      self.splice(index, 0, value);
    } else if (typeof self === "string") {
      const valueStr = toString(value);
      const result = [self.slice(0, index), valueStr, self.slice(index)].join('');
      return result;
    } else {
      throw new RuntimeError("insert called on an invalid type");
    }
  });

  p.addGlobalIntrinsic("remove(self,k)", function(self: any, k: any): any {
    if (self instanceof Map) {
      if (self.has(k)) {
        self.delete(k);
        return 1;
      } else {
        return 0;
      }
    } else if (self instanceof Array) {
      if (k == null) {
        throw new RuntimeError("argument to 'remove' must not be null");
      }
      let index = toIntegerValue(k);
      if (index < 0) {
        index += self.length;
      }
      checkRange(index, 0, self.length-1);
      self.splice(index, 1);
      return null;
    } else if (typeof self === "string") {
      if (k == null) {
        throw new RuntimeError("argument to 'remove' must not be null");
      }
      const s = toString(k);
      const foundPos = s.indexOf(k);
      if (foundPos < 0) {
        return self;
      }
      const result = self.replace(k, "");
      return result;
    }
    throw new RuntimeError("Type Error: 'remove' requires map, list, or string");
  });

  p.addGlobalIntrinsic("replace(self,oldVal,newVal,maxCount=null)",
  function(self: any, oldVal: any, newVal: any, maxCountVal: any): any {
    if (self === null) {
      throw new RuntimeError("argument to 'replace' must not be null");
    }
    let maxCount = -1;
    if (maxCountVal !== null) {
      maxCount = toIntegerValue(maxCountVal);
      if (maxCount < 1) {
        return self;
      }
    }
    let count = 0;
    if (self instanceof Map) {
      const keysToChange = [];
      for (let key of self.keys()) {
        const value = self.get(key);
        if (equals(value, oldVal)) {
          keysToChange.push(key);
          count += 1;
          if (maxCount > 0 && count === maxCount) {
            break;
          }
        }
      }
      for (let key of keysToChange) {
        self.set(key, newVal);
      }
      return self;
    } else if (self instanceof Array) {
      for (let i = 0; i < self.length; i++) {
        if (equals(self[i], oldVal)) {
          self[i] = newVal;
          count++;
        }
        if (maxCount > 0 && count == maxCount) {
          break;
        }
      }
      return self;
    } else if (typeof self === "string") {
      let str = toString(self);
      let oldstr = oldVal === null ? "" : toString(oldVal);
      if (isNullOrEmpty(oldstr)) {
        throw new RuntimeError("replace: oldval argument is empty");
      }
      let newstr = newVal == null ? "" : toString(newVal);
      let idx = 0;
      while (true) {
        idx = str.indexOf(oldstr, idx);
        if (idx < 0) {
          break;
        }
        str = str.substring(0, idx) + newstr + str.substring(idx + oldstr.length);
        idx += newstr.length;
        count++;
        if (maxCount > 0 && count == maxCount) {
          break;
        }
      }
      return str;
    }
    throw new RuntimeError("Type Error: 'replace' requires map, list, or string");
  });

  p.addGlobalIntrinsic("slice(seq,from=0,to=null)",
  function(sequence: any, fromIdx: any, toIdx: any,): any {
    const newCollection = slice(p, sequence, fromIdx, toIdx);
    return newCollection;
  });

  p.addGlobalIntrinsic("split(self,delimiter=\" \",maxCount=-1)",
  function(self: any, delimiter: any, maxCount: any,): Array<string> {
    self = toString(self);
    delimiter = toString(delimiter);
    maxCount = toIntegerValue(maxCount);

    let result: string[] = [];
    let pos = 0;

		while (pos < self.length) {
		  let nextPos;
			
      if (maxCount >= 0 && result.length == maxCount - 1) {
        // Force finishing loop
        nextPos = self.length;
      } else if (delimiter.length == 0) {
        // Split by every char if delimiter is empty
        nextPos = pos + 1;
      } else { 
        // Advance 
        nextPos = self.indexOf(delimiter, pos);
      }
					
      if (nextPos < 0) {
        nextPos = self.length;
      }
					
      result.push(self.substring(pos, nextPos));

			pos = nextPos + delimiter.length;

			if (pos == self.length && delimiter.length > 0) {
        result.push("");
      }
		}

		return result;
  });

  p.addGlobalIntrinsic("indexOf(self,value,after=null)", function(self: any, value: any, after: number | null): number | null {
    if (self instanceof Array || typeof self === "string") {
      let afterIdx = after !== null ? after : -1;
      // If negative, wrap around
      if (afterIdx < -1) {
        afterIdx += self.length;
      }
      if (afterIdx < -1 || afterIdx >= self.length-1) {
        return null;
      }
      const idx = self.indexOf(value, afterIdx + 1);
      return idx >= 0 ? idx : null;
    } else if (self instanceof Map) {
      let startSearch = after == null ? true : false;
      for(let key of self.keys()) {
        if (startSearch) {
          const mapValue = self.get(key);
          if (mapValue === value) {
            return key;
          }
        } else if (key === after) {
          startSearch = true;
        }
      }
      return null;
    } else {
      return null;
    }
  });

  p.addGlobalIntrinsic("hasIndex(self,index)", function(self: any, index: any): number | null {
    if (self instanceof Map) {
      return self.has(index) ? 1 : 0;
    } else if (self instanceof Array || typeof self === "string") {
      if (typeof index === "number" && self.length > 0) {
        return index >= -self.length && index < self.length ? 1 : 0;
      } else {
        return 0;
      }
    } else {
      return null;
    }
  });

  p.addGlobalIntrinsic("pop(self)", function(self: any): any | null {
    if (self instanceof Array) {
      if (self.length < 1) {
        return null;
      }
      const result = self.pop();
      // Return the removed element
      return result;
    } else if (self instanceof Map) {
      if (self.size < 1) {
        return null;
      }
      // Remove the element corresponding to (the arbirtrary)
      // first key
      const firstKey = self.keys().next().value;
      self.delete(firstKey);
      // Return removed key
      return firstKey;
    } else {
      return null;
    }
  });


  p.addGlobalIntrinsic("pull(self)", function(self: any): any | null {
    if (self instanceof Array) {
      if (self.length < 1) {
        return null;
      }
      const result = self[0];
      // Remove the first element (in place!)
      self.splice(0,1);
      // Return the removed element
      return result;
    } else if (self instanceof Map) {
      if (self.size < 1) {
        return null;
      }
      // Remove the element corresponding to (the arbirtrary)
      // first key
      const firstKey = self.keys().next().value;
      self.delete(firstKey);
      // Return removed key
      return firstKey;
    } else {
      return null;
    }
  });

  p.addGlobalIntrinsic("push(self,value)", function(self: any, value: any): any | null {
    if (self instanceof Array) {
      self.push(value);
      return self;
    } else if (self instanceof Map) {
      self.set(value, 1);
      return self;
    } else {
      return null;
    }
  });

  p.addGlobalIntrinsic("indexes(self)", function(self: any): any[] | null {
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


  p.addGlobalIntrinsic("values(self)", function(self: any): any {
    if (self instanceof Map) {
      const values = Array.from( self.values() );
      return values;
    } else if (typeof self === "string") {
      const letters = Array.from( self );
      return letters;
    } else {
      return self;
    }
  });

  // Sorts IN PLACE!
  p.addGlobalIntrinsic("sort(self,byKey=null,ascending=1)", 
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

      if (byKey === null) {
        self.sort(compareByValues);
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
        // Empty list and push all values to it
        self.splice(0, self.length);
        for (let keyedValue of keyedList) {
          self.push(keyedValue.value);
        }
      }

      if (toBooleanNr(ascending) === 0) {
        self.reverse();
      }

      return self;
  });


  p.addGlobalIntrinsic("str(self)", function(value: any): string {
    const result: string = formatValue(value);
    return result;
  });

  p.addGlobalIntrinsic("rnd", function(): number {
    return Math.random();
  });

  p.addGlobalIntrinsic("abs(x)", function(x: any): number {
    if (typeof x === "number") {
      return Math.abs(x);
    } else {
      return 0;
    }
  });

  p.addGlobalIntrinsic("upper(self)", function(value: any): string | any {
    if (typeof value === "string") {
      return value.toUpperCase();
    } else {
      return value;
    }
  });

  p.addGlobalIntrinsic("lower(self)", function(value: any): string | any {
    if (typeof value === "string") {
      return value.toLowerCase();
    } else {
      return value;
    }
  });

  // range(start,stop[,step])
  p.addGlobalIntrinsic("range(start,stop,step=null)", function(start: number, stop: number, step: number) {
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
