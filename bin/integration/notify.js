#!/usr/bin/env node
const IstanbulReport = require("../../src/integration/istanbul-report");
const SlackNotify = require("../../src/integration/slack-notify");
const TextNotify = require("../../src/integration/text-notify");
const fs = require("fs");

// Runs Coverage Notifier
const settings = {
    useTextNotify: !process.env.SLACK_WEBHOOK,
    istanbul: {
        testsResultsFile: "mochawesome-report/output.json"
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
if (packageJson.coverage && packageJson.coverage.integration) {
    settings.istanbul.testsResultsFile = packageJson.coverage.integration.testsResultsFile || settings.istanbul.testsResultsFile;
    settings.slack.channel = packageJson.coverage.integration.channel || settings.slack.channel;
    settings.slack.username = packageJson.coverage.integration.username || settings.slack.username;
    settings.project.projectName = packageJson.coverage.integration.projectName || settings.project.projectName || packageJson.name;
    settings.project.repositoryUrl = packageJson.coverage.integration.repositoryUrl;
    settings.haltOnFailure = Object.prototype.hasOwnProperty.call(packageJson.coverage.integration, "haltOnFailure")
        ? packageJson.coverage.integration.haltOnFailure
        : settings.haltOnFailure;
}

const reports = new IstanbulReport(settings.istanbul);

reports
    .processResults()
    .then(coverage => {
        settings.project.coverage = coverage;
        return new Promise((resolve, reject) => {
            if (settings.useTextNotify) {
                const textNotify = new TextNotify();
                textNotify.printCoverage(settings.project);

                if (settings.project.coverage.success) {
                    resolve();
                } else {
                    reject(new Error("Tests failed"));
                }
            } else {
                const slack = new SlackNotify(settings.slack);
                slack.buildCoveragePayload(settings.project)
                    .then(data => {
                        slack.sendNotification(data, () => {
                            if (settings.project.coverage.success) {
                                resolve();
                            } else {
                                reject(new Error("Tests failed"));
                            }
                        });
                    });
            }
        });
    })
    .catch(() => {
        //eslint-disable-next-line no-process-exit
        process.exit(1)
    });
