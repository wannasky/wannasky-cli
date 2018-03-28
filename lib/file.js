const fs = require('fs'),
    path = require('path'),
    logger = require('./logger')

let file = {

    filter: (directory, callback) => {
        let result = [];

        const loop = (dir) => {
            let list = fs.readdirSync(dir);
            let stat, filePath;
            list.forEach(file => {
                filePath = path.resolve(dir, file);
                stat = fs.lstatSync(filePath);
                if (stat.isDirectory()) {
                    loop(filePath);
                } else {
                    if (callback(stat, filePath)) {
                        result.push(filePath);
                    }
                }
            });
        }

        try {
            loop(directory);
            return result;
        } catch (error) {
            logger.error('查找文件失败')
        }
    }
}

module.exports = file;