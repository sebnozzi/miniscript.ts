
function parseTestSuite(testSuiteContents) {
  const lines = testSuiteContents.split("\n");

  const tests = [];
  let test = null;
  let mode = "header";
  let lineNr = 1;

  for (let line of lines) {
    if (line.startsWith("====")) {
      if (mode === "output") {
        tests.push(test);
        mode = "header";
        test = null;
      }
      if (test === null) {
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

describe('Parser', function() {

  let tests = [];

  before(async function() {
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
        describe('Parser Suite (dynamic)', function() {
          tests = parseTestSuite(contents);
          for (let test of tests) {
            const srcCode = test.code.join("\n");
            const header = test.headers[1];
            // TODO: skip these for now
            if (test.output[0].startsWith("Compiler Error:")) {
              it(header + ' (line ' + test.lineNr +')');
            } else {
              it(header + ' (line ' + test.lineNr +')', function() {
                const parser = new Parser(srcCode);
                parser.parse();
              });
            }
          }
        });
      });
  });

  it("stub", async function(){})  // this is important!

});
