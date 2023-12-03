type HashMapEntry = {
  key: any,
  value: any
};

class HashMap {

  private _size: number = 0;
  private buckets: Map<any, Array<HashMapEntry>>;
  private valueSetWatchers: null | Map<any, Array<Function>>;

  constructor() {
    this.buckets = new Map<any, Array<HashMapEntry>>();
    this.valueSetWatchers = null;
  }

  size(): number {
    return this._size;
  }

  onAfterValueSet(key: any, callback: (newValue: any) => void) {
    if (this.valueSetWatchers === null) {
      this.valueSetWatchers = new Map();
    }
    let watchers = this.valueSetWatchers.get(key);
    if (watchers === undefined) {
      watchers = new Array();
    }
    watchers.push(callback);
    this.valueSetWatchers.set(key, watchers);
  }

  set(key: any, value: any) {
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

    // Notify watchers of value set
    if (this.valueSetWatchers !== null) {
      const watchers = this.valueSetWatchers.get(key);
      if (watchers instanceof Array) {
        for (let callback of watchers) {
          callback(value);
        }
      }
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

  has(key: any): any {
    const _hashCode = hashCode(key);
    const bucket = this.buckets.get(_hashCode);
    if (!bucket) {
        return false;
    }
    return bucket.length > 0;
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