type HashMapEntry = {
  key: any,
  value: any
};

class HashMap {
  private _size: number = 0;
  private buckets: Map<any, Array<HashMapEntry>>;

  constructor() {
    this.buckets = new Map<any, Array<HashMapEntry>>();
  }

  size(): number {
    return this._size;
  }

  set(key: any, value: any) {
    if (value === undefined) {
      this.delete(key);
      return;
    }
    const _hashCode = hashCode(key);
    let bucket = this.buckets.get(_hashCode);
    if (!bucket) {
      bucket = new Array<HashMapEntry>();
      this.buckets.set(_hashCode, bucket);
    }
    // Look for existing entry
    for (let i = 0; i < bucket.length; ++i) {
      // Map already contains something under given key.
      // Overwrite with new value.
      if (equals(bucket[i].key, key)) {
          bucket[i].value = value;
          return;
      }
    }
    // If no existing entry, add new
    bucket.push({ key: key, value: value });
    this._size += 1;
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

}