
class AddrLabel {
  constructor(public readonly idx: number) {
  }
}

class CodeBuilder {

  prg: Code;
  ip: number;
  addresses: Map<AddrLabel, number>;
  unresolvedIdx = 0;
  unresolved: number[];

  srcMapIpStart: number;
  srcMap: SourceMap;

  constructor() {
    this.prg = new Code();
    this.ip = 0;
    this.addresses = new Map();
    this.unresolved = [];

    this.srcMapIpStart = -1;
    this.srcMap = new SourceMap();
  }

  push(opCode: BC, arg1: any = undefined, arg2: any = undefined) {
    this.prg.push(opCode, arg1, arg2);
    this.ip++;
  }
  
  push_unresolved(opCode: BC, arg1: any = undefined, arg2: any = undefined) {
    if (!(arg1 instanceof AddrLabel) && !(arg2 instanceof AddrLabel)) {
      throw new Error("Expected one of the parameters to be an address label");
    }
    this.prg.push(opCode, arg1, arg2);
    this.unresolved.push(this.ip);
    this.ip++;
  }

  newLabel() {
    const addLabel = new AddrLabel(this.unresolvedIdx);
    this.unresolvedIdx += 1;
    return addLabel;
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
      if (hasCallPotential(opCode)) {
        return true;
      }
    }
    return false;
  }

  define_address(label: AddrLabel) {
    this.addresses.set(label, this.ip);
  }

  build(): Code {
    this.resolveAddresses()
    const code = this.prg;
    code.srcMap = this.srcMap;
    return code;
  }

  private resolveAddresses() {
    const resolveAddr = (uaddr: number, argArray: Array<any>) => {
      let label = argArray[uaddr];
      if (label instanceof AddrLabel) {
        let prgAddr = this.addresses.get(label);
        if (prgAddr === undefined) {
          throw new Error(`No address for label ${label} at address ${uaddr}`);
        }
        // Replace with resolved address
        argArray[uaddr] = prgAddr;
        return 1;
      } else {
        return 0;
      }
    }

    for (let uaddr of this.unresolved) {
      let resolvedCount = 0;
      resolvedCount += resolveAddr(uaddr, this.prg.arg1);
      resolvedCount += resolveAddr(uaddr, this.prg.arg2);
      if (resolvedCount === 0) {
        throw new Error("No addresses resolved for " + uaddr);
      }
    }
  }

}