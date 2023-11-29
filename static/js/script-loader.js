addEventListener("DOMContentLoaded", (event) => {
  const scriptUrls = getScriptURLs();
  if (scriptUrls.length == 0) {
    console.warn("No miniScript sources found");
  } else if (scriptUrls.length > 1) {
    console.warn("Only one source supported for now");
  } else {
    const url = scriptUrls[0];
    fetchAndRunScript(url);
  }
  const canvas = document.getElementById("userEventLayer");
  canvas.focus();
});

function fetchAndRunScript(scriptUrl) {
  fetch(scriptUrl)
  .then(response => response.text())
  .then(srcCode => {
    console.log(srcCode);
    runCode(srcCode, scriptUrl);
  });
}

function runCode(srcCode, scriptUrl) {
  const t0 = performance.now();

  const interp = buildInterpreter(scriptUrl);
  interp.onStarted = () => {
    console.log("Started Running.")
  }
  interp.onFinished = () => {
    const t1 = performance.now();
    console.log("Finished Running.", t1 - t0, "ms");
  }
  interp.onCompiled = (code) => {
    console.log("Compiled code:", code);
  }

  interp.runSrcCode(srcCode);  
}

function buildInterpreter(scriptUrl) {
  const txtCallback = (txt) => { console.log(txt); };
  const interp = new MMLikeInterpreter(txtCallback, txtCallback);
  interp.setScriptUrl(scriptUrl);
  return interp;
}

function getScriptURLs() {
  const srcParam = getUrlParam("src");
  if (srcParam) {
    return [srcParam];
  }
  const urls = [];
  const scripts = document.getElementsByTagName("script");
  for (let script of scripts) {
    if (script.hasAttribute("type")) {
      const scriptType = script.getAttribute("type");
      if (scriptType.toLowerCase() === "text/miniscript") {
        const miniScriptUrl = script.getAttribute("src");
        if (miniScriptUrl) {
          urls.push(miniScriptUrl);
        }
      }
    }
  }

  return urls;
}


function getUrlParam(paramName) {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has(paramName)) {
    const value = urlParams.get(paramName);
    return value;
  } else {
    return null;
  }
}