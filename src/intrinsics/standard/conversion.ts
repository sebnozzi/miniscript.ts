import { Processor } from "../../vm/processor";
import { formatValue } from "./print";

export function addConversionIntrinsics(p: Processor) {

  p.addIntrinsic("str(self)", 
  function(value: any): string {
    const result: string = formatValue(value);
    return result;
  });

  // Try to convert to a number
  p.addIntrinsic("val(self)", 
  function(x: any): number | null {
    if (typeof x === "number") {
      return x;
    } else if (typeof x === "string") {
      let result: number = Number(x);
      if (isNaN(result)) {
        return 0;
      } else {
        return result;
      }
    } else {
      return null;
    }
  });
  
}
