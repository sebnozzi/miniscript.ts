import { Code } from "./code";
import { Context } from "./context";

export class Frame {
  public readonly ip: number;
  public readonly code: Code;
  public readonly context: Context;

  constructor(code: Code, ip: number, frameContext: Context) {
    this.code = code;
    this.ip = ip;
    this.context = frameContext;
  }
}