
function parseSignature(functionSignature: string): [string, string[], any[]] {
  let fnName: string = functionSignature;
  let argNames: string[] = [];
  let defaultValues: any[] = [];

  // If the signature is not of a function without parameters
  // parse the parameters and possible default values.
  if (functionSignature.indexOf("(") > 0) {
    const nameArgsParts = functionSignature.split("(");
    fnName = nameArgsParts[0].trim();
    const argsParts = nameArgsParts[1].slice(0,-1).split(",");
    for (let part of argsParts) {
      const argValueParts = part.split("=");
      const argName = argValueParts[0].trim();
      let defaultValue: any = undefined;
      if (argValueParts.length > 1) {
        const defaultValueStr = argValueParts[1].trim();
        // Now parse ... 
        if (defaultValueStr === "null") {
          defaultValue = null;
        } else if (defaultValueStr.startsWith("\"")) {
          defaultValue = defaultValueStr.slice(1,-1);
        } else if (defaultValueStr.includes(".")) {
          defaultValue = parseFloat(defaultValueStr);
        } else {
          defaultValue = parseInt(defaultValueStr);
        }
      }
      argNames.push(argName);
      defaultValues.push(defaultValue);
    }
  }

  return [fnName, argNames, defaultValues];
}