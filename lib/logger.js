const chalk = require('chalk');

const prefix = '@wans/cli';

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

//日志打印
exports.log = (...args) => {
    console.log(chalk.white(prefix), chalk.green(now()), ...args);
}

//debug日志
exports.debug = (...args) => {
    console.log(chalk.cyan(prefix), chalk.cyan(now()), ...args);
}

//成功日志
exports.success = (...args) => {
    console.log(chalk.green(prefix), chalk.green(now()), ...args);
}

//失败日志
exports.error = (...args) => {
    console.error(chalk.red(prefix), chalk.red(now()), ...args)
}
