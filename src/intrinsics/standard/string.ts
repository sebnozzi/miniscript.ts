
function addStringIntrinsics(p: Processor) {

  p.addGlobalIntrinsic("upper(self)", 
  function(value: any): string | any {
    if (typeof value === "string") {
      return value.toUpperCase();
    } else {
      return value;
    }
  });

  p.addGlobalIntrinsic("lower(self)", 
  function(value: any): string | any {
    if (typeof value === "string") {
      return value.toLowerCase();
    } else {
      return value;
    }
  });

}
