async function fetchAndParseTestSuite() {
  let options = {
    method: 'GET',
    credentials: "include",    
    headers: {}
  };
  return fetch('TestSuite.txt', options)
    .then(response => {
      return response.text();
    })
    .then(contents => {
      return parseTestSuite(contents);
    });
}

function parseTestSuite(testSuiteContents) {
  const lines = testSuiteContents.split("\n");

  const tests = [];
  let lineNr = 1;
  let mode = "header";

  let test = {
    lineNr: lineNr,
    headers: [],
    code: [],
    output: []
  };

  for (let line of lines) {
    if (line.startsWith("====")) {
      if (mode === "output") {
        tests.push(test);
        mode = "header";
        test = {
          lineNr: lineNr,
          headers: [],
          code: [],
          output: []
        };
      }
      test.headers.push(line);
    } else if(line.startsWith("----")) {
      mode = "output";
    } else {
      if (mode === "header") {
        mode = "code"
      }
      // Append line
      if (mode === "code") {
        test.code.push(line);
      } else {
        test.output.push(line);
      }
    }
    lineNr++;
  }
  tests.push(test);
  return tests;
}
