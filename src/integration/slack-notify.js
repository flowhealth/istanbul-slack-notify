const Promise = require("es6-promise").Promise;
const Slack = require("slack-node");

class SlackNotify {
    constructor(settings) {
        this.settings = settings || {};
        this.settings.timeout = this.settings.timeout || 5000;
        this.settings.result = {
            pass: {text: "passed", color: "#36a64f", icon: ":thumbsup:"},
            fail: {text: "failed", color: "#dc5547", icon: ":thumbsdown:"}
        };
        if (!this.settings.webhook) {
            throw new Error("Slack webhook url is required (settings.webhook)")
        }
    }

    buildCoveragePayload(data) {
        return new Promise((resolve, reject) => {
            if (!data || !data.coverage) {
                reject(new Error("Coverage and/or build data was not provided"))
            }

            let icon = this.settings.result.pass.icon;
            let attachments = [
                {
                    color: this.settings.result.pass,
                    mrkdwn_in: ['text', 'title'],
                    title: `Cypress. ${data.projectName} - all tests have been passes!`,
                    title_link: `${data.repositoryUrl}/commits`,
                    fields: [
                        {
                            title: "All suits",
                            value: `${data.coverage.suites}`,
                            short: true
                        },
                        {
                            title: "All tests",
                            value: `${data.coverage.tests}`,
                            short: true
                        },
                        {
                            title: "Passed",
                            value: `${data.coverage.passes}`,
                            short: true
                        },
                        {
                            title: "Pending",
                            value: `${data.coverage.pending}`,
                            short: true
                        },
                        {
                            title: "Failures",
                            value: `${data.coverage.failures}`,
                            short: true
                        }
                    ]
                },
            ];

            if (!data.coverage.success) {
                icon = this.settings.result.fail.icon;
                attachments = [
                    {
                        color: this.settings.result.fail,
                        mrkdwn_in: ['text', 'title'],
                        title: `Cypress. ${data.projectName} - tests failed:`,
                        fields: data.coverage.testsFailed
                            .map(info => ({title: info.title})),
                    }
                ]
            }

            const payload = {
                username: this.settings.username,
                channel: this.settings.channel,
                icon_emoji: icon,
                attachments,
            };
            resolve(payload);
        });
    }

    sendNotification(payload, cb) {
        return new Promise((resolve, reject) => {
            if (!payload) {
                reject(new Error("No slack payload provided"))
            }
            const timeout = setTimeout(() => {
                reject(new Error('Took too long to send slack request'));
            }, this.settings.timeout);

            const slack = new Slack();
            slack.setWebhook(this.settings.webhook);
            slack.webhook(payload, (err) => {
                clearTimeout(timeout);
                if (err) {
                    return reject(err);
                }
                cb();
                return resolve();
            });
        });
    }
}

module.exports = SlackNotify;
