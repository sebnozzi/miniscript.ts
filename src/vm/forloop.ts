import { HashMap } from "./hashmap";

export class ForLoop {
  public readonly startAddr: number;
  public readonly endAddr: number;
  public readonly localVarName: string;
  public readonly values: any;
  public readonly mapObj: HashMap | null;
  private valueIdx: number;
  private valueCount: number;

  constructor(startAddr: number, endAddr: number, localVarName: string, values: any) {
    this.startAddr = startAddr;
    this.endAddr = endAddr;
    this.localVarName = localVarName;
    this.valueIdx = 0;
    if (values instanceof Array) {
      this.values = values;
      this.mapObj = null;
    } else if (values instanceof HashMap) {
      this.values = Array.from(values.keys());
      this.mapObj = values;
    } else if (typeof values === "string") {
      this.values = Array.from(values);
      this.mapObj = null;
    } else {
      this.values = [];
      this.mapObj = null;
    }
    this.valueCount = this.values.length;
  }

  isOver(): boolean {
    return this.valueIdx >= this.valueCount;
  }

  // Gets current value and increases counter
  iterate(): any {
    let currentValue: any;
    if (this.mapObj) {
      const currentKey = this.values[this.valueIdx];
      const currentMapValue = this.mapObj.get(currentKey);
      currentValue = new HashMap();
      currentValue.set("key", currentKey);
      currentValue.set("value", currentMapValue);
    } else {
      currentValue = this.values[this.valueIdx];
    }
    this.valueIdx++;
    return currentValue;
  }

}