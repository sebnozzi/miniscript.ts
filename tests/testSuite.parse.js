
describe('Parser', function() {

  let tests = [];

  before(async function() {

    return fetchAndParseTestSuite().then(tests => {

      describe('Parse Suite (dynamic)', function() {
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

  it("force-loading suite", async function(){});  // this is important!

});
