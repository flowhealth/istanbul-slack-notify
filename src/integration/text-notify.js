require('colors');

class TextNotify {
    constructor() {
        this.emojis = {};
        this.emojis.fail = ["(︶︹︺)", "ʕノ•ᴥ•ʔノ ︵ ┻━┻", "ヽ(｀Д´)ﾉ", "┌ಠ_ಠ)┌∩┐", "╚(•⌂•)╝", "(┛◉Д◉)┛彡┻━┻"];
        this.emojis.pass = ["ᕕ(⌐■_■)ᕗ ♪♬", "(ﾉ◕ヮ◕)ﾉ*:･ﾟ✧", "＼（＾○＾）人（＾○＾）／", "ヽ(^◇^*)/", "~=[,,_,,]:3"];
    }

    static getEmoji(emojis) {
        return emojis[Math.floor(Math.random() * emojis.length)];
    }

    /* eslint-disable no-console */
    printCoverage(data) {
        if (!data || !data.coverage) {
            throw new Error("coverage information missing");
        }

        if (!data.coverage.success) {
            console.log("Tests Failed:\n".bold.red)
            data.coverage.testsFailed.forEach(info => console.log(`${info.title}`.red));
        } else {
            console.log("All tests have been passed".bold.green);
        }
    }
    /* eslint-enable no-console */
}

module.exports = TextNotify;
