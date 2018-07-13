const path = require('path');
const fileUtil = require('../util/fileUtil');
const logger = require('../util/logger').createLogger();


// 默认配置文件
const CONFIG_FILE_NAME = 'wans.config.js';

class Config {

    constructor(fileName) {
        this.file = fileName && fileName.endsWith('.js') ? fileName : CONFIG_FILE_NAME;
        this.path = path.resolve(process.cwd(), this.file);
        if (fileUtil.exist(this.path)) {
            this.content = require(this.path);
        } else {
            logger.error(`${this.path} 配置文件不存在`);
            process.exit();
        }
    }

    has(key) {
        return this.content.hasOwnProperty(key);
    }

    get(key) {
        return key ? this.content[key] : this.content;
    }

}

// 构造函数
exports.Config = Config;

// 创建config实例
exports.createConfig = (fileName) => new Config(fileName);
