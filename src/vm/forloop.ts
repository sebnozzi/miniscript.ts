class ForLoop {
  public readonly startAddr: number;
  public readonly endAddr: number;
  public readonly localVarName: string;
  public readonly values: any
  private valueIdx: number;
  private valueCount: number;

  constructor(startAddr: number, endAddr: number, localVarName: string, values: any[]) {
    this.startAddr = startAddr;
    this.endAddr = endAddr;
    this.localVarName = localVarName;
    this.values = values;
    this.valueIdx = 0;
    this.valueCount = values.length;
  }

  isOver(): boolean {
    return this.valueIdx >= this.valueCount;
  }

  // Gets current value and increases counter;
  iterate(): any {
    const currentValue: any = this.values[this.valueIdx];
    this.valueIdx++;
    return currentValue;
  }

}