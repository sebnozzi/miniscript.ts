
class CodeBuilder {

  prg: Code;
  ip: number;
  addresses: {[label: string]: number};
  unresolved: number[];

  constructor() {
    this.prg = new Code();
    this.ip = 0;
    this.addresses = {}
    this.unresolved = [];
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

  define_address(label: string) {
    this.addresses[label] = this.ip;
  }

  build(): Code {
    this.resolveAddresses()
    return this.prg;
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