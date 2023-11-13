
function testSuite(suiteFileName, description) {

  describe('VM', function() {

    before(async function() {

      return fetchAndParseTestSuite(suiteFileName).then(tests => {

        describe(description, function() {
          for (let test of tests) {
            const header = test.headers[1];
            const testName = header + ' (line ' + test.lineNr +')';

            it(testName, function(done) {
              
              const srcCode = test.code.join("\n");
              const expectedOutput = test.output;

              console.log(testName);
              runCode(srcCode, testName, (lines) => {
                try {
                  if (lines.length !== expectedOutput.length) {
                    console.error("Expected: ", expectedOutput);
                    console.error("Actual: ", lines);
                    chai.assert.fail("Line lengths differ. Expected: " + expectedOutput.length + ". Found: " + lines.length);
                  } else {
                    for (let i = 0; i < lines.length; i++) {
                      const actual = lines[i];
                      const expected = expectedOutput[i];
                      chai.assert.equal(actual, expected);
                    }
                  }
                  done();
                } catch(e) {
                  throw e;
                }
              });

            });
            
          }
        });

      });

    });

    it("force-loading suite", async function(){});  // this is important!

  });

}

function testSuiteParsing(suiteFileName, description) {
  describe('Parser', function() {

    let tests = [];
  
    before(async function() {
  
      return fetchAndParseTestSuite(suiteFileName).then(tests => {
  
        describe(description, function() {
          for (let test of tests) {
            const srcCode = test.code.join("\n");
            const header = test.headers[1];
            it(header + ' (line ' + test.lineNr +')', function() {
              const parser = new Parser(srcCode);
              try {
                parser.parse();
              } catch(e) {
                if (e instanceof ParserError && !e.message.startsWith("Compiler Error:")) {                 
                  throw e;
                }
              }
            });
          }
        });
  
      });
  
    });
  
    it("force-loading suite", async function(){});  // this is important!
  
  });
  
}