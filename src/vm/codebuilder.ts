
class CodeBuilder {

  prg: Code;
  ip: number;
  addresses: {[label: string]: number};
  unresolvedIdx = 0;
  unresolved: number[];

  srcMapIpStart: number;
  srcMap: SourceMap;

  constructor() {
    this.prg = new Code();
    this.ip = 0;
    this.addresses = {}
    this.unresolved = [];

    this.srcMapIpStart = -1;
    this.srcMap = new SourceMap();
  }

  push(opCode: BC, arg1: any = null, arg2: any = null) {
    this.prg.opCodes.push(opCode)
    this.prg.arg1.push(arg1)
    this.prg.arg2.push(arg2)
    this.ip++
  }
  
  push_unresolved(opCode: BC, arg1: any = null, arg2: any = null) {
    this.prg.opCodes.push(opCode)
    this.prg.arg1.push(arg1)
    this.prg.arg2.push(arg2)
    this.unresolved.push(this.ip)
    this.ip++
  }

  newLabel() {
    return `addr_${this.unresolvedIdx++}`;
  }

  startMapEntry() {
    this.srcMapIpStart = this.ip;
  }

  endMapEntry(srcLoc: SrcLocation) {
    const ipStart = this.srcMapIpStart;
    const ipEnd = this.ip - 1;
    if (ipStart < 0) {
      throw new Error("No starting map-entry");
    }
    // Check if the range has a call within
    // If so, mark as step-in-able
    const hasCall = this.containsCall(ipStart, ipEnd);
    // Create entry
    if (hasCall) {
      this.srcMap.pushCall(ipStart, ipEnd, srcLoc);
    } else {
      this.srcMap.pushEntry(ipStart, ipEnd, srcLoc);
    }
    this.srcMapIpStart = -1;
  }

  containsCall(ipStart: number, ipEnd: number): boolean {
    for(let idx = ipStart; idx <= ipEnd; idx++) {
      const opCode = this.prg.opCodes[idx];
      if (opCode == BC.CALL) {
        return true;
      }
    }
    return false;
  }

  define_address(label: string) {
    this.addresses[label] = this.ip;
  }

  build(): Code {
    this.resolveAddresses()
    const code = this.prg;
    code.srcMap = this.srcMap;
    return code;
  }

  private resolveAddresses() {
    for (let uaddr of this.unresolved) {
      let label_1 = this.prg.arg1[uaddr];
      if (label_1) {
        let addr_1 = this.addresses[label_1];
        if (addr_1) {
          this.prg.arg1[uaddr] = addr_1;
        }
      }
      let label_2 = this.prg.arg2[uaddr];
      if (label_2) {
        let addr_2 = this.addresses[label_2];
        if (addr_2) {
          this.prg.arg2[uaddr] = addr_2;
        }
      }
    }
  }

}