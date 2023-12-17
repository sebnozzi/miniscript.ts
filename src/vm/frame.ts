import { Code } from "./code";
import { Context } from "./context";
import { ForLoopContext } from "./forloop";

export class Frame {
  public readonly ip: number;
  public readonly code: Code;
  public readonly context: Context;
  public readonly forLoopContext: ForLoopContext;

  constructor(code: Code, ip: number, frameContext: Context, forLoopContext: ForLoopContext) {
    this.code = code;
    this.ip = ip;
    this.context = frameContext;
    this.forLoopContext = forLoopContext;
  }
}