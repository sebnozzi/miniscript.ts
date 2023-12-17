import { HashMap } from "./vm/hashmap";

export { Interpreter } from "./interpreter/interpreter";

export { Processor } from "./vm/processor";

export { Debugger } from "./debugger/debugger";
export { Code } from "./vm/code";

export {
  equals,
  notEquals,
  isaEquals,
  toNumberValue,
  toTwoNumbers,
  toIntegerValue,
  formatValue,
} from "./vm/runtime";

export function newMap(parentMap: HashMap | null = null): HashMap {
  const newMap = new HashMap();
  if (parentMap instanceof HashMap) {
    newMap.set("__isa", parentMap);
  }
  return newMap;
}