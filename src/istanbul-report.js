const Promise = require("es6-promise").Promise;
const istanbul = require("istanbul");
const fs = require("fs");

class IstanbulReport {

    constructor(settings) {
        this.settings = settings || {};
        this.settings.rootDir = this.settings.rootDir || "./";
        this.settings.coverageFiles = this.settings.coverageFiles || ["coverage/coverage-final.json"];
        this.settings.summaryFile = this.settings.summaryFile || "coverage/coverage-summary.json";
        this.jestResults = this.settings.testsResultsFile || "jest-results.json";
        this.sanitizeThreshold(this.settings.threshold);
        if (this.settings.coverageFiles.length === 0) {
            throw new Error("Require at least one coverage istanbul file (settings.coverageFiles)");
        }
    }

    sanitizeThreshold(threshold) {
        if (typeof this.settings.threshold === "undefined") {
            this.settings.threshold = 80;
        } else if (threshold > 100) {
            this.settings.threshold = 100;
        } else if (threshold < 0) {
            this.settings.threshold = 0;
        }
    }

    generateSummary() {
        let files = this.settings.coverageFiles.map((file) => `${this.settings.rootDir}/${file}`);
        return new Promise((resolve, reject) => {
            const collector = new istanbul.Collector();
            const reporter = new istanbul.Reporter();
            reporter.addAll(['json-summary']);
            try {
                files.forEach((file) => collector.add(JSON.parse(fs.readFileSync(file, 'utf8'))));
                reporter.write(collector, false, () => {
                    return resolve();
                });
            } catch (e) {
                reject(new Error('Error reading coverage files. Generate istanbul report(s) first'));
            }
        });
    }

    processSummary() {
        let coverageSummary = `${this.settings.rootDir}/${this.settings.summaryFile}`;
        let readFile = new Promise((resolve, reject) => {
            fs.readFile(coverageSummary, 'utf-8', (err, data) => {
                if (err) {
                    reject(new Error(`Error processing file: ${this.settings.summaryFile}`));
                }

                fs.readFile(this.jestResults, 'utf-8', (err, jestResults) => {
                    if (err) {
                        reject(new Error(`Error processing file: ${this.jestResults}`));
                    }

                    resolve({data, jestResults});
                })
            })
        });
        return readFile
            .then(({data, jestResults}) => {
                const jestResultsParsed = JSON.parse(jestResults);
                let summary = JSON.parse(data);
                let coverage = {
                    statements: summary.total.statements.pct,
                    branches: summary.total.branches.pct,
                    lines: summary.total.lines.pct,
                    functions: summary.total.functions.pct,
                    testsFailed: jestResultsParsed.testResults.reduce((memo, curr) => {
                        if (curr.numFailingTests > 0) {
                            const result = {
                                path: curr.testFilePath.substring(curr.testFilePath.indexOf('/mp-webapp')),
                            };
                            if (curr.testResults.length > 0) {
                                curr.testResults.forEach(item => {
                                    if (item.status === 'failed') {
                                        result.messages = (result.messages || []).concat(item.fullName);
                                    }
                                });
                            }
                            return memo.concat(result);
                        }

                        return memo
                    }, [])
                };
                coverage.project = (coverage.branches + coverage.statements + coverage.lines + coverage.functions) / 4;
                coverage.project = parseFloat(coverage.project.toFixed(2));
                coverage.threshold = this.settings.threshold;
                coverage.success = this.settings.threshold <= coverage.project;
                return Promise.resolve(coverage);
            });
    }
}

module.exports = IstanbulReport;
