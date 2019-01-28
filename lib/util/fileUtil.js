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

    removeFile: (filePath) => {
        let state = fs.lstatSync(filePath);
        if(state.isFile()) {
            fs.unlinkSync(filePath);
        }else if(state.isDirectory()){
            const files = fs.readdirSync(filePath);
            files.forEach(childFile => {
                file.removeFile(path.join(filePath, childFile));
            });
            fs.rmdirSync(filePath);
        }
    },

    // 创建目录
    createDir: (file) => {
        let folders = path.dirname(file).split(path.sep);
        let temp = '';
        while (folders.length) {
            temp += folders.shift() + path.sep;
            if (!fs.existsSync(temp)) {
                fs.mkdirSync(temp);
            }
        }
    },

    copyFile: (sourcePath, targetPath) => {
        file.createDir(targetPath);
        fs.copyFileSync(sourcePath, targetPath);
    },

    copyDir: (sourcePath, targetPath) => {
        const paths = fs.readdirSync(sourcePath);
        let state, spath, dpath;
        paths.forEach(pt => {
            spath = path.join(sourcePath, pt);
            dpath = path.join(targetPath, pt);
            state = fs.lstatSync(spath);
            file.createDir(dpath);
            if(state.isFile()) {
                fs.createReadStream(spath).pipe(fs.createWriteStream(dpath));
            }else if(state.isDirectory()) {
                file.copyDir(spath, dpath);
            }
        });
    },

    // 写文件
    writeFile: (filePath, data, callback) => {
        fs.watchFile(filePath, data, callback);
    },

    // 同步写文件
    writeFileSync: (filePath, data) => {
        fs.writeFileSync(filePath, data, 'utf8');
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
