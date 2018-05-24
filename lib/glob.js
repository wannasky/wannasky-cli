const Glob = require('glob');
const minimatch = require('minimatch');
const path = require('path');

const _filterFile = (file, exclude) => {
    let ret = false;
    for (let pattern of exclude) {
        if (typeof pattern === 'string') {
            ret = ret || minimatch(file, pattern);
        } else if (pattern instanceof RegExp) {
            ret = ret || pattern.test(file);
        } else {
            ret = ret || false;
        }
    }
    return !ret;
}

const _mapMain = (pattern, exclude, options) => {
    const cwd = process.cwd();
    pattern = path.resolve(cwd, pattern);
    exclude = exclude.map(item => path.resolve(cwd, item));
    let files = Glob.sync(pattern, Object.assign({nodir: true}, options));
    return files.filter(item => _filterFile(item, exclude));
}

/**
 * 获取符合条件的文件数据
 * @param files {Array} 需要处理的文件数组
 * @param exclude {Array=} 排除的文件数组
 * @param options {object=} 自定义配置
 * @returns {Array}
 */
const glob = (files = [], exclude = [], options = {}) => {
    let globs = [];
    files.forEach(pattern => {
        globs = globs.concat(_mapMain(pattern, exclude, options));
    });
    return globs;
}

module.exports = glob;
