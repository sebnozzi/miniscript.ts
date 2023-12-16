import { Processor } from "../../vm/processor";
import { formatValue, toStr } from "../../vm/runtime";

export function addPrintIntrinsic(p: Processor) {

  // Accumulate text-parts here until a newline is processed
  let stdoutBuffer: string[] = [];

  p.addIntrinsic('print(s="",delimiter=null)', 
  function(value: any, delimiter: any) {
    if (delimiter === null) {
      delimiter = "\n";
    }
    delimiter = toStr(delimiter);

    let text = formatValue(value) + delimiter;
    const delimiterIdxAndLength = (s: string): [number,number] => {
      let idx = s.indexOf("\n\r");
      if (idx >= 0) { return [idx, 2] }
      idx = s.indexOf("\r\n");
      if (idx >= 0) { return [idx, 2] }
      idx = s.indexOf("\n");
      if (idx >= 0) { return [idx, 1] }
      idx = s.indexOf("\r");
      return [idx, 1];
    }

    // If the text contains newline-delimiters split it
    // and add the snippets to the buffer. At each delimiter
    // invoke the callback, which only deals with "whole"
    // (delimited / terminated) lines.
    while (text.length > 0) {
      const [nextIdx, delimLen] = delimiterIdxAndLength(text);
      if (nextIdx < 0) {
        // No newline delimiter in text
        // Push it to the buffer and return
        stdoutBuffer.push(text);
        return;
      } else {
        const part = text.slice(0, nextIdx);
        // Add length to skip the matched delimiter
        const rest = text.slice(nextIdx + delimLen);
        text = rest;
        stdoutBuffer.push(part);
        // And flush, invoking callback and clearing buffer
        const joined = stdoutBuffer.join("");
        p.stdoutCallback(joined);
        stdoutBuffer = [];
      }
    }
  });

}
