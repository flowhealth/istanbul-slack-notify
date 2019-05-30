#!/usr/bin/env node
const ProcessResponder = require("../../src/unit/process-responder");
const IstanbulReport = require("../../src/unit/istanbul-report");
const SlackNotify = require("../../src/unit/slack-notify");
const TextNotify = require("../../src/unit/text-notify");
const fs = require("fs");

// Runs Coverage Notifier
const settings = {
    useTextNotify: !process.env.SLACK_WEBHOOK,
    istanbul: {
        rootDir: process.env.PWD,
        coverageFiles: ["coverage/coverage-final.json"],
        summaryFile: "coverage/coverage-summary.json",
        threshold: 100,
        testsResultsFile: "jest-results.json"
    },
    slack: {
        webhook: process.env.SLACK_WEBHOOK
    },
    project: {
        projectName: process.env.npm_package_name
    },
    haltOnFailure: false
};

// Overwrite settings from package.json if defined
const packageJson = JSON.parse(fs.readFileSync("./package.json"));
if (packageJson.coverage && packageJson.coverage.unit) {
    settings.istanbul.coverageFiles = packageJson.coverage.unit.coverageFiles || settings.istanbul.coverageFiles;
    settings.istanbul.threshold = packageJson.coverage.unit.threshold || settings.istanbul.threshold;
    settings.istanbul.testsResultsFile = packageJson.coverage.unit.testsResultsFile || settings.istanbul.testsResultsFile;
    settings.slack.channel = packageJson.coverage.unit.channel || settings.slack.channel;
    settings.slack.username = packageJson.coverage.unit.username || settings.slack.username;
    settings.project.projectName = packageJson.coverage.unit.projectName || settings.project.projectName || packageJson.name;
    settings.project.repositoryUrl = packageJson.coverage.unit.repositoryUrl;
    settings.haltOnFailure = Object.prototype.hasOwnProperty.call(packageJson.coverage.unit, "haltOnFailure")
        ? packageJson.coverage.unit.haltOnFailure
        : settings.haltOnFailure;
}

const reports = new IstanbulReport(settings.istanbul);

const handleResults = () => {
    let coverage = reports.processSummary();
    return new Promise((resolve, reject) => {
        return Promise.all([coverage])
            .then(values => {
                settings.project.coverage = values[0];
                if (settings.useTextNotify) {
                    const textNotify = new TextNotify();
                    textNotify.printCoverage(settings.project);

                    if (settings.project.coverage.testsFailed.length > 0) {
                        reject(new Error("Tests failed"));
                    } else {
                        resolve(settings);
                    }
                } else {
                    const slack = new SlackNotify(settings.slack);
                    slack.buildCoveragePayload(settings.project)
                        .then(data => {
                            slack.sendNotification(data, () => {
                                if (settings.project.coverage.testsFailed.length > 0) {
                                    reject(new Error("Tests failed"));
                                } else {
                                    resolve(settings);
                                }
                            });
                        });
                }
            })
            .catch(error => reject(error));
    });
};

reports
    .generateSummary()
    .then(handleResults)
    .then(settings => ProcessResponder.respond(settings))
    .catch(() => {
        //eslint-disable-next-line no-process-exit
        process.exit(1)
    });
