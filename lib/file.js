const fs = require('fs'),
    path = require('path'),
    logger = require('./logger')

let file = {

    /**
     * 查看当前目录文件是否存在
     * @param direction
     * @param callback
     * @param isDeep
     * @returns {boolean}
     */
    has: (direction, callback, isDeep = false) => {
        let result = file.filter(direction, callback, isDeep);
        return !!result.length;
    },

    /**
     * 文件过滤
     * @param directory
     * @param callback
     * @param isDeep
     * @returns {Array}
     */
    filter: (directory, callback, isDeep = true) => {
        let result = [];

        const loop = (dir) => {
            let list = fs.readdirSync(dir);
            let stat, filePath;
            list.forEach(file => {
                filePath = path.resolve(dir, file);
                stat = fs.lstatSync(filePath);
                if (stat.isDirectory() && isDeep) {
                    loop(filePath);
                } else {
                    if (callback(stat, filePath, path.basename(filePath))) {
                        result.push(filePath);
                    }
                }
            });
        }

        try {
            let stat = fs.lstatSync(directory);
            if(stat.isDirectory()) {
                loop(directory);
            }else{
                if (callback(stat, directory)) {
                    result.push(filePath);
                }
            }
            return result;
        } catch (error) {
            result = [];
        }
        return result;
    }
}

module.exports = file;