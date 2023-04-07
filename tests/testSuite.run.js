
describe('VM', function() {

  let tests = [];

  before(async function() {

    return fetchAndParseTestSuite().then(tests => {

      describe('Run Suite (dynamic)', function() {
        for (let test of tests) {
          const header = test.headers[1];
          const testName = header + ' (line ' + test.lineNr +')';
          // TODO: skip these for now
          if (test.output[0].startsWith("Compiler Error:")) {
            it(testName);
          } else {
            it(testName, function(done) {
              
              const srcCode = test.code.join("\n");
              const expectedOutput = test.output;

              runCode(srcCode, testName, (lines) => {
                chai.assert.deepEqual(lines, expectedOutput);
                done();
              });

            });
          }
        }
      });

    });

  });

  it("force-loading suite", async function(){});  // this is important!

});
