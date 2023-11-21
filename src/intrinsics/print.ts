
function addPrintIntrinsic(p: Processor) {
  p.addGlobalIntrinsic("print(s=\"\")", function(value: any) {
    const text = formatValue(value);
    p.stdoutCallback(text);
  });
}

function formatValue(value: any, quoteStrings: boolean = false): string {
  let text = "";
  if (typeof value === "number") {
    text = formatNumber(value);
  } else if (value instanceof Array) {
    const formattedValues = [];
    for (const e of value) {
      formattedValues.push(formatValue(e, true));
    }
    text = "[" + formattedValues.join(", ") + "]";
  } else if (value instanceof HashMap) {
    const formattedPairs = [];
    for (let e of value.entries()) {
      const formattedKey = formatValue(e.key, true);
      const formattedValue = formatValue(e.value, true);
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

function formatNumber(value: Number): string {
  const isFloat = !Number.isInteger(value) && Number.isFinite(value);
  let text: string = "";
  if (isFloat) {
    if (value> 1E10 || value < -1E10 || (value < 1E-6 && value > -1E-6)) {
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
