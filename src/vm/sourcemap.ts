
type SourceMapEntry = {
  ipStart: number;
  ipEnd: number;
  srcLoc: SrcLocation;
  isCall: boolean;
}

class SourceMap {

  entries: SourceMapEntry[];

  constructor() {
    this.entries = [];
  }

  pushEntry(ipStart: number, ipEnd: number, srcLoc: SrcLocation, isCall: boolean = false) {
    const entry = {
      ipStart: ipStart,
      ipEnd: ipEnd,
      srcLoc: srcLoc,
      isCall: isCall,
    };
    this.entries.push(entry);
  }

  pushCall(ipStart: number, ipEnd: number, srcLoc: SrcLocation) {
    this.pushEntry(ipStart, ipEnd, srcLoc, true);
  }

  findEntry(ip: number): SourceMapEntry | null {
    for(let entry of this.entries) {
      if (ip >= entry.ipStart && ip <= entry.ipEnd) {
        return entry;
      }
    }
    return null;
  }

}