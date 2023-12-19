import { HashMap, MapEntry } from "../lib/hashmap";
import { MAX_ISA_RECURSION_DEPTH, Processor } from "./processor";
import { RuntimeError } from "./runtime";

export type MSMapFactory = {
  newMap(): MSMap;
}

export class MSMap {

  private mapObj: HashMap;
  private valueSetOverriders: null | Map<any, Array<Function>>;

  constructor(private vm: Processor) {
    this.mapObj = new HashMap();
    this.valueSetOverriders = null;
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
    if (this.valueSetOverriders === null) {
      this.valueSetOverriders = new Map();
    }
    let overriders = this.valueSetOverriders.get(key);
    if (overriders === undefined) {
      overriders = new Array();
    }
    overriders.push(callback);
    this.valueSetOverriders.set(key, overriders);
  }

  set(key: any, value: any) {
    // Process value-set overriders
    // Keep the latest returned value
    if (this.valueSetOverriders !== null) {
      const overrideFunctions = this.valueSetOverriders.get(key);
      if (overrideFunctions instanceof Array) {
        for (let overrideFunction of overrideFunctions) {
          value = overrideFunction(value);
        }
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

  toJSMap(depth:number = 16): Map<any,any> {
    return this.mapObj.toMap(depth);
  }

}