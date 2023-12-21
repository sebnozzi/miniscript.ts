import { MSMap, MSMapFactory } from "./msmap";

export class ForLoop {
  public readonly startAddr: number;
  public readonly endAddr: number;
  public readonly localVarName: string;
  public readonly values: any;
  public readonly mapObj: MSMap | null;
  private valueIdx: number;
  private valueCount: number;

  constructor(private mapFactory: MSMapFactory, startAddr: number, endAddr: number, localVarName: string, values: any) {
    this.startAddr = startAddr;
    this.endAddr = endAddr;
    this.localVarName = localVarName;
    this.valueIdx = 0;
    if (values instanceof Array) {
      this.values = values;
      this.mapObj = null;
    } else if (values instanceof MSMap) {
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
      const currentMapValue = this.mapObj.getOpt(currentKey);
      currentValue = this.mapFactory.newMap();
      currentValue.set("key", currentKey);
      currentValue.set("value", currentMapValue);
    } else {
      currentValue = this.values[this.valueIdx];
    }
    this.valueIdx++;
    return currentValue;
  }

}

// Used to store currently-running for-loops in the current
// context.
export class ForLoopContext {

  private readonly forLoops: {[id: number]: ForLoop};

  constructor() {
    this.forLoops = {};
  }

  registerForLoop(forLoopNr: number, forLoop: ForLoop) {
    this.forLoops[forLoopNr] = forLoop;
  }

  getForLoop(forLoopNr: number): ForLoop {
    return this.forLoops[forLoopNr];
  }
  
  deleteForLoop(forLoopNr: number) {
    delete this.forLoops[forLoopNr];
  }

}