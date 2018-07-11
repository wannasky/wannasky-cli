
const chalk = require('chalk');

class HelpLogger{

    constructor(preEmptyLength, maxKeyLength){
        this.preEmptyLength = preEmptyLength;
        this.maxKeyLength = maxKeyLength;
    }

    print(key = '', value) {
        let logStr = '';
        if(value){
            let keyEmpty = this.maxKeyLength-key.length;
            keyEmpty = keyEmpty < 0 ? 0 : keyEmpty;
            logStr = ' '.repeat(this.preEmptyLength) + chalk.cyan(key) + ' '.repeat(keyEmpty) + value;
        }else{
            logStr = ' '.repeat(this.preEmptyLength) + key;
        }
        console.log(logStr);
    }
}

exports.createLogger = (preEmptyLength, maxKeyLength) => new HelpLogger(preEmptyLength, maxKeyLength);

exports.l1 = new HelpLogger(1);
exports.l2 = new HelpLogger(5);
exports.l3 = new HelpLogger(10, 15);
exports.l4 = new HelpLogger(15, 15);
exports.l5 = new HelpLogger(20, 15);
exports.l6 = new HelpLogger(25, 15);
exports.l7 = new HelpLogger(30, 15);

