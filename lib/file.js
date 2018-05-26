const fs = require('fs'),
    path = require('path');

let file = {

    //统一路径规范
    // 多 // 多\\ 全部转换为 path.sep
    pathFormat: (file) => {
        return file.replace(/[\\|\/]+/g, path.sep);
    },

    // extname
    extname: (file) => {
        return path.extname(file).replace(/^\./, '').toLowerCase();
    },

    // 查看文件是否存在
    exist: (file) => {
        let exist = false;
        try{
            fs.lstatSync(file);
            exist = true;
        }catch (e) {
            exist = false;
        }
        return exist;
    },

    /**
     * 查看当前目录文件是否存在
     * @param directory
     * @param callback
     * @param isDeep
     * @returns {boolean}
     */
    has: (directory, callback, isDeep = false) => {
        let result = file.filter(directory, callback, isDeep);
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
                    if (callback(stat, filePath, path.win32.basename(filePath))) {
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
                    result.push(directory);
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
