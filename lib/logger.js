const chalk = require('chalk');

let prefix = '@wans/cli';

const now = () => {
    let date = new Date();
    let H = date.getHours(),
        M = date.getMinutes(),
        S = date.getSeconds(),
        m = date.getMilliseconds();
    H = H > 9 ? H : '0' + H;
    M = M > 9 ? M : '0' + M;
    S = S > 9 ? S : '0' + S;
    m = m > 9 ? m : '0' + m;
    return `[${H}:${M}:${S}.${m}]`;
}

const print = (logger, type, ...args) => {
    if (logger.silent || !logger.level.includes(type)) return;
    console && console.log(...args);
}

/**
 * 日志打印
 */
class Logger {

    constructor(options = {}) {
        options.prefix && (prefix = options.prefix);
        this.silent = !!options.silent;
        this.level = Array.isArray(options.level) ? options.level
            : (options.level ? [options.level] : ['log', 'debug', 'success', 'error']);
    }

    setSilent(silent) {
        this.silent = silent;
    }

    log(...args) {
        print(this, 'log', chalk.white(prefix), chalk.green(now()), ...args);
    }

    debug(...args) {
        print(this, 'debug', chalk.cyan(prefix), chalk.cyan(now()), ...args);
    }

    success(...args) {
        print(this, 'success', chalk.green(prefix), chalk.green(now()), ...args);
    }

    error(...args) {
        print(this, 'error', chalk.red(prefix), chalk.red(now()), ...args);
    }
}

exports.Logger = Logger;

exports.createLogger = options => {
    return new Logger(options);
}
