
function addPrintImplicit(p: Processor) {
  p.addGlobalImplicit("print(s)", function(value: any) {
    const text = formatValue(value);
    p.stdoutCallback(text);
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
  } else if (value instanceof Map) {
    const formattedPairs = [];
    for (let [key, mapValue] of value.entries()) {
      const formattedKey = formatValue(key, true);
      const formattedValue = formatValue(mapValue, true);
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
