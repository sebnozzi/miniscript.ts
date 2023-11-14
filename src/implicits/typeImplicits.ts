
function addPrototypeImplicits(p: Processor) {

  p.addListNative("len", function(self: Array<any>): number {
    return self.length;
  });

  p.addMapNative("len", function(self: Map<any, any>): number {
    return self.size;
  });

  p.addStringNative("len", function(self: string): number {
    return self.length;
  });

  p.addListNative("indexOf", function(self: Array<any>, value: any): number {
    return self.indexOf(value);
  });

  p.addMapNative("indexOf", function(self: Map<any, any>, value: any): any {
    for(let [key,mapValue] of self) {
      if (mapValue === value) {
        return key;
      }
    }
    return null;
  });

  p.addStringNative("indexOf", function(self: string, value: any): number {
    return self.indexOf(value);
  });

}