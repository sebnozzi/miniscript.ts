import { hashCode, equals } from "./runtime";

export type HashMapEntry = {
  key: any,
  value: any
};

export class HashMap {

  private _size: number = 0;
  private buckets: Map<any, Array<HashMapEntry>>;
  private valueSetOverriders: null | Map<any, Array<Function>>;

  constructor() {
    this.buckets = new Map<any, Array<HashMapEntry>>();
    this.valueSetOverriders = null;
  }

  size(): number {
    return this._size;
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
    
    if (value === undefined) {
      this.delete(key);
      return;
    }

    // Locate bucket
    const _hashCode = hashCode(key);
    let bucket = this.buckets.get(_hashCode);
    if (!bucket) {
      bucket = new Array<HashMapEntry>();
      this.buckets.set(_hashCode, bucket);
    }

    let entryFound = false;
    // Look for existing entry in bucket
    for (let i = 0; i < bucket.length; i++) {
      // Map already contains something under given key.
      // Overwrite with new value.
      if (equals(bucket[i].key, key)) {
          bucket[i].value = value;
          entryFound = true;
          break;
      }
    }
    // If no existing entry, add new
    if (!entryFound) {
      bucket.push({ key: key, value: value });
      this._size += 1;
    }

  }

  get(key: any): any | undefined {
    const _hashCode = hashCode(key);
    const bucket = this.buckets.get(_hashCode);
    if (!bucket) {
        return undefined;
    }
    for (let i = 0; i < bucket.length; ++i) {
      if (equals(bucket[i].key, key)) {
        return bucket[i].value;
      }
    }
    return undefined;
  }

  has(key: any): any {
    const _hashCode = hashCode(key);
    const bucket = this.buckets.get(_hashCode);
    if (!bucket) {
        return false;
    }
    for (let i = 0; i < bucket.length; ++i) {
      if (equals(bucket[i].key, key)) {
        return true;
      }
    }
    return false;
  }

  delete(key: any) {
    const _hashCode = hashCode(key);
    const bucket = this.buckets.get(_hashCode);
    if (!bucket) {
        return;
    }
    let bucketIdx = -1;
    for (let i = 0; i < bucket.length; ++i) {
      if (equals(bucket[i].key, key)) {
        bucketIdx = i;
        break;
      }
    }
    if (bucketIdx >= 0) {
      bucket.splice(bucketIdx, 1);
      this._size -= 1;
    }
    if (bucket.length == 0) {
      this.buckets.delete(_hashCode);
    }
  }

  keys(): Array<any> {
    const keys = new Array();
    for (let bucket of this.buckets.values()) {
      for (let i = 0; i < bucket.length; ++i) {
        keys.push(bucket[i].key);
      }
    }
    return keys;
  }

  values(): Array<any> {
    const values = new Array();
    for (let bucket of this.buckets.values()) {
      for (let i = 0; i < bucket.length; ++i) {
        values.push(bucket[i].value);
      }
    }
    return values;
  }

  // TODO: implement returning an iterator to avoid
  // unnecessary traversing
  entries(): Array<HashMapEntry> {
    const entries = new Array<HashMapEntry>();
    for (let bucket of this.buckets.values()) {
      for (let i = 0; i < bucket.length; ++i) {
        entries.push(bucket[i]);
      }
    }
    return entries;
  }

  toMap(depth:number = 16): Map<any,any> {
    if (depth < 0) {
      return new Map();
    }
    const result = new Map<any,any>();
    for (let bucket of this.buckets.values()) {
      for (let i = 0; i < bucket.length; ++i) {
        const entry = bucket[i];
        let key = entry.key;
        let value = entry.value;
        if (key instanceof HashMap) {
          key = key.toMap(depth - 1);
        }
        if (value instanceof HashMap) {
          value = value.toMap(depth - 1);
        }
        result.set(key, value);
      }
    }
    return result;
  }

}