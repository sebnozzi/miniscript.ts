
function addPrintIntrinsic(p: Processor) {

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

function formatValue(value: any, quoteStrings: boolean = false, depth: number = 16): string {
  let text = "";
  if (typeof value === "number") {
    text = formatNumber(value);
  } else if (value instanceof Array) {
    if (depth < 0 ) {
      return "[ a List ]";
    }
    const formattedValues = [];
    for (const e of value) {
      formattedValues.push(formatValue(e, true, depth - 12));
    }
    text = "[" + formattedValues.join(", ") + "]";
  } else if (value instanceof HashMap) {
    if (depth < 0 ) {
      return "{ a Map }";
    }
    const formattedPairs = [];
    for (let e of value.entries()) {
      const formattedKey = formatValue(e.key, true, depth - 15);
      const formattedValue = formatValue(e.value, true, depth - 14);
      const formattedPair = formattedKey + ": " + formattedValue;
      formattedPairs.push(formattedPair);
    }
    text = "{" + formattedPairs.join(", ") + "}";
  } else if (typeof(value) === "string" && quoteStrings) {
    text = "\"" + value + "\"";
  } else if (typeof(value) === "boolean") {
    return value ? "1" : "0";
  } else if (value instanceof BoundFunction) {
    const formattedArgs: string[] = [];
    for (let arg of value.funcDef.arguments) {
      if (arg.defaultValue !== undefined) {
        formattedArgs.push(`${arg.name}=${arg.defaultValue}`);
      } else {
        formattedArgs.push(`${arg.name}`);
      }
    }
    const joinedArgs = formattedArgs.join(", ");
    return `FUNCTION(${joinedArgs})`;
  } else {
    text = "" + value;
  }
  return text;
}

function formatNumber(value: number): string {
  const isFloat = !Number.isInteger(value) && Number.isFinite(value);
  let text: string = "";
  if (isFloat) {
    if (value > 1E10 || value < -1E10 || (value < 1E-6 && value > -1E-6)) {
      // Format very large or small numbers in exponential form
      text = value.toExponential(6);
      // Pad exponential with leading zero if only one digit
      text = text.replace(/[eE]([-+])(\d)$/,"E$10$2")
    } else {
      text = "" + (round(value, 6) || 0);
    }
  } else {
    text = value.toString();
  }
  return text;
}
