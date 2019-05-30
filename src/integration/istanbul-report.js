const Promise = require("es6-promise").Promise;
const fs = require("fs");

class IstanbulReport {

    constructor(settings) {
        this.settings = settings || {};
        this.settings.rootDir = this.settings.rootDir || "./";
        this.cypressResults = this.settings.testsResultsFile || "mochawesome-report/output.json";
    }

    processResults() {
        let readFile = new Promise((resolve, reject) => {
            fs.readFile(this.cypressResults, 'utf-8', (err, cypressResults) => {
                if (err) {
                    reject(new Error(`Error processing file: ${this.cypressResults}`));
                }

                resolve(cypressResults);
            })
        });
        return readFile
            .then((cypressResults) => {
                const cypressResultsParsed = JSON.parse(cypressResults);
                const coverage = {
                    suites: cypressResultsParsed.stats.suites,
                    tests: cypressResultsParsed.stats.tests,
                    passes: cypressResultsParsed.stats.passes,
                    pending: cypressResultsParsed.stats.pending,
                    failures: cypressResultsParsed.stats.failures,
                    testsFailed: [],
                };
                cypressResultsParsed.suites.suites.forEach(item => item.tests.forEach(test => {
                    if (test.fail) {
                        coverage.testsFailed.push({title: test.fullTitle})
                    }
                }));
                coverage.success = coverage.testsFailed.length === 0;

                return Promise.resolve(coverage);
            });
    }
}

module.exports = IstanbulReport;
