
function formatValue(value: any, inCollection: boolean = false): string {
  let text = "";
  if (value instanceof Array) {
    const formattedValues = [];
    for (const e of value) {
      formattedValues.push(formatValue(e, true));
    }
    text = "[" + formattedValues.join(", ") + "]";
  } else if (typeof(value) === "string" && inCollection) {
    text = "\"" + value + "\"";
  } else {
    text = "" + value;
  }
  return text;
}

function addPrintImplicit(p: Processor, fnAcceptingLine: Function) {
  p.addNative("print", 1, function(value: any) {
    const text = formatValue(value);
    fnAcceptingLine(text);
  });
}

function addImplicits(p: Processor) {

  p.addNativeWithDefaults("range", 3, [undefined, undefined, null], function(start: number, stop: number, step: number) {
    checkInt(start, "Argument 'start' should be integer");
    checkInt(stop, "Argument 'stop' should be integer");

    const result: number[] = [];

    if (start < stop) {
      step = step === null ? 1 : step;
      checkInt(step, "Argument 'step' should be integer");
      if (step < 1) {
        throw new Error("Argument 'step' should be a positive number in this case");
      }
      for (let i = start; i <= stop; i += step) {
        result.push(i);
      }
    } else {
      step = step === null ? -1 : step;
      checkInt(step, "Argument 'step' should be integer");
      if (step >= 0) {
        throw new Error("Argument 'step' should be a negative number in this case");
      }
      for (let i = start; i >= stop; i += step) {
        result.push(i);
      }
    }

    return result;
  });

  p.addNative("clear", 0, function() {
    const canvas = document.getElementById("gfx") as HTMLCanvasElement;
    const gfx = canvas.getContext("2d") as CanvasRenderingContext2D;
    gfx.clearRect(0,0,canvas.width,canvas.height);
  });

  // fillEllipse x,y,w,h,c
  p.addNative("fillEllipse", 5, function(x:number,y:number,width:number,height:number,color:string) {
    const canvas = document.getElementById("gfx") as HTMLCanvasElement;
    const gfx = canvas.getContext("2d") as CanvasRenderingContext2D;
    gfx.fillStyle = color;
    gfx.beginPath();
    gfx.ellipse(x,y,width,height,0,0,Math.PI*2);
    gfx.fill();
  });

}

function checkInt(arg: any, errorMsg: string) {
  if (Number.isInteger(arg)) {
    return;
  } else {
    throw new Error(errorMsg);
  }
}