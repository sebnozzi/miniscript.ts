import { HashMap, MapEntry } from "../lib/hashmap";
import { MAX_ISA_RECURSION_DEPTH, Processor } from "./processor";
import { RuntimeError } from "./runtime";

export type MSMapFactory = {
  newMap(): MSMap;
}

export class MSMap {

  private mapObj: HashMap;
  private valueSetOverrides: null | Map<any, Function>;

  constructor(private vm: Processor) {
    this.mapObj = new HashMap();
    this.valueSetOverrides = null;
  }

  get(key: any): any {
    const result = this.getOpt(key);
    if (result === undefined) {
      throw new RuntimeError(`Key Not Found: '${key}' not found in map`);
    } else {
      return result;
    }
  }

  getOpt(key: any, depth: number = 0): any | undefined {
    if (depth > MAX_ISA_RECURSION_DEPTH) {
      throw new RuntimeError(`__isa depth exceeded (perhaps a reference loop?)`);
    }
    if (this.mapObj.has(key)) {
      return this.mapObj.get(key);
    } else if (this.hasParent()) {
      return this.parentMap().getOpt(key, depth + 1); 
    } else if (this === this.vm.mapCoreType) {
      return undefined;
    } else {
      return this.vm.mapCoreType.getOpt(key, depth + 1); 
    }
  }

  getWithSource(key: any, depth: number = 0): [any, MSMap] {
    if (depth > MAX_ISA_RECURSION_DEPTH) {
      throw new RuntimeError(`__isa depth exceeded (perhaps a reference loop?)`);
    }
    if (this.mapObj.has(key)) {
      return [this.mapObj.get(key), this];
    } else if (this.hasParent()) {
      return this.parentMap().getWithSource(key, depth + 1); 
    } else if (this === this.vm.mapCoreType) {
      throw new RuntimeError(`Key Not Found: '${key}' not found in map`);
    } else {
      return this.vm.mapCoreType.getWithSource(key, depth + 1); 
    }
  }

  size(): number {
    return this.mapObj.size();
  }

  // Creates a sub-map / instance, having this
  // as its isa-parent.
  newChildMap(): MSMap {
    const newMap = new MSMap(this.vm);
    newMap.set("__isa", this);
    return newMap;
  }

  hasParent() {
    return this.mapObj.has("__isa")  
  }

  parentMap(): MSMap {
    const result = this.mapObj.get("__isa");
    if (result instanceof MSMap) {
      return result
    } else {
      throw new RuntimeError("No parent map. Always check first with hasParent()");
    }
  }

  // Makes it possible to execute an action before attempting
  // to set a new value and even change the value to be set.
  overrideSettingValue(key: any, callback: (newValue: any) => any) {
    if (this.valueSetOverrides === null) {
      this.valueSetOverrides = new Map();
    }
    this.valueSetOverrides.set(key, callback);
  }

  removeSettingValueOverride(key: any) {
    if (this.valueSetOverrides instanceof Map) {
      this.valueSetOverrides.delete(key);
    }
  }

  set(key: any, value: any) {
    // Process value-set overrider
    // Keep returned value
    if (this.valueSetOverrides !== null) {
      const overrideFunction = this.valueSetOverrides.get(key);
      if (overrideFunction instanceof Function) {
        value = overrideFunction(value);
      }
    }

    // Set passed / overridden value
    this.mapObj.set(key, value);
  }

  has(key: any): any {
    return this.mapObj.has(key);
  }

  delete(key: any) {
    this.mapObj.delete(key);
  }

  keys(): Array<any> {
    return this.mapObj.keys();
  }

  values(): Array<any> {
    return this.mapObj.values();
  }

  entries(): Array<MapEntry> {
    return this.mapObj.entries();
  }

  isaEquals(type: MSMap): number {
    if (type === this.vm.mapCoreType) {
      return 1;
    } else {
      // Walk up the "isa" chain until a match is found
      let p = null;
			p = this.getOpt("__isa");
			while (p != null) {
				if (p === type) {
          return 1;
        }
				if (!(p instanceof MSMap)) {
          return 0;
        } else {
          p = p.getOpt("__isa");
        }
			}
			return 0;
    }
  }

  toJSMap(depth:number = 16): Map<any,any> {
    return this.mapObj.toMap(depth);
  }

}