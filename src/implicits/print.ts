
function addPrintImplicit(p: Processor, fnAcceptingLine: (txt:string) => any) {
  p.addNative("print", 1, function(value: any) {
    const text = formatValue(value);
    fnAcceptingLine(text);
  });
}

function formatValue(value: any, quoteStrings: boolean = false): string {
  let text = "";
  if (value instanceof Array) {
    const formattedValues = [];
    for (const e of value) {
      formattedValues.push(formatValue(e, true));
    }
    text = "[" + formattedValues.join(", ") + "]";
  } else if (typeof(value) === "string" && quoteStrings) {
    text = "\"" + value + "\"";
  } else if (typeof(value) === "boolean") {
    return value ? "1" : "0";
  } else {
    text = "" + value;
  }
  return text;
}
