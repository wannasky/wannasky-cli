const RcLoader = require('rcloader');
const jshintcli = require('jshint/src/cli');
const fs = require('fs');
const jsHint = require('jshint').JSHINT;
const glob = require('../glob');


const logger = require('../util/logger').createLogger({prefix: '@wans/cli/jshint'});

//处理options配置文件
const extendOptions = (opts = {}) => {
    //TODO
    return opts;
}

/**
 *
 * js文件检查
 * @param {Object} options 配置文件
 * @param {string[]} options.file 需要jshint的文件
 * @param {string[]} options.exclude 需要排除的文件
 * @param {Object} options.options jshint配置文件
 * @param {Function=} callback 回调函数
 */
const jshint = (options = {}, callback) => {
    //logger
    if(options.silent) logger.setSilent(options.silent);

    //组合需要jshint的文件
    extendOptions(options);

    //获取处理文件数组
    const fileArray = glob(options.files, options.exclude);

    //生成.jshintrc文件
    const rcLoader = new RcLoader('.jshintrc', options.options, {
        loader: (path) => {
            let conf = jshintcli.loadConfig(path);
            delete conf.dirname;
            return conf;
        }
    });

    //统计jshint结果
    let statistics = {};

    fileArray.forEach((file, index) => {
        rcLoader.for(file, (error, conf) => {
            if (error) logger.error(error);
            let str = fs.readFileSync(file, {encoding: 'utf-8'});

            //global配置需要提取出来
            let globals = {};
            if(conf.globals){
                globals = conf.globals;
                delete conf.globals;
            }

            let result = jsHint(str, conf, globals);
            if(!result){
                statistics[file] = statistics[file] || [];
                jsHint.errors.forEach(item => {
                    statistics[file].push({
                        line: item.line,
                        evidence: item.evidence,
                        reason: item.reason,
                    });
                });
                statistics[file] = statistics[file].sort((pre, post) => {
                    return pre.line - post.line;
                });

                let words = statistics[file].map(item => {
                    return `错误行号：${item.line}，错误原因：${item.reason}\r\n`;
                });

                logger.error(`检测到异常：\r\n文件路径：${file}\r\n${words.join('')}`);
            }

            if(index === fileArray.length - 1){
                logger.log('jshint finish');
                if(callback) callback(statistics);
            }
        });
    });

}

module.exports = jshint;
