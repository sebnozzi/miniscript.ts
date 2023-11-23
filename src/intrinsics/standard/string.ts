
function addStringIntrinsics(p: Processor) {

  p.addIntrinsic("upper(self)", 
  function(value: any): string | any {
    if (typeof value === "string") {
      return value.toUpperCase();
    } else {
      return value;
    }
  });

  p.addIntrinsic("lower(self)", 
  function(value: any): string | any {
    if (typeof value === "string") {
      return value.toLowerCase();
    } else {
      return value;
    }
  });

}
