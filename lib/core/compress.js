const path = require('path');
const fs = require('fs');
const fileUtil = require('../util/fileUtil');
const glob = require('../glob');
const progress = require('../util/progress');
const chalk = require('chalk');
const gaze = require('gaze');

const logger = require('../util/logger').createLogger({prefix: '@wans/cli/compress'});


const DEFAULT = {
    filename: '[name].min.[ext]'
}

const extendOptions = (options) => {
    options.src = options.src || './';
    options.dist = options.dist || './';
    //当options.src与options.dist不相同时默认执行复制options.src下的其他文件
    options.needCopy = path.normalize(options.src) !== path.normalize(options.dist);
    options.base = path.resolve(process.cwd(), options.src);
    options.filename = options.filename || DEFAULT.filename;
    options.files = (options.files || []).map(item => path.join(options.src, item));
    options.exclude = (options.exclude || []).map(item => path.join(options.src, item));
    return options;
}

// 用以记录scss文件import关系
// key {string} 是引用的文件
// value {Array} 是此文件变化需要重新编译的文件
let scssImportArray = {};

// 过滤scss
const isOnlyImportScss = (file) => {
    return fileUtil.extname(file) === 'scss'
        && path.basename(file).indexOf('_') === 0;
}

const getCssSourceMapFile = (options, allOptions, file) => {
    if(options.css && options.css.sourceMap){
        let sourceMap = options.css.sourceMap;
        if(options.css.sourceMap === true){
            sourceMap = './';
        }
        let filename = path.basename(file, path.extname(file));
        let fileNameFormat = typeof allOptions.filename === 'string' ? allOptions.filename
            : (allOptions.filename.css ? allOptions.filename.css : DEFAULT.filename);
        let base = path.dirname(path.relative(allOptions.base, file));
        let dist = path.join(path.join(allOptions.dist, sourceMap), base, fileNameFormat);
        return  dist.replace(/\[name\]/g, filename).replace(/\[ext\]/g, 'css.map');
    }
    return undefined;
}

const saveStyleSourceMap = (options, content) => {
    fileUtil.createDir(options.sourceMap);
    fs.writeFileSync(options.sourceMap, content.replace(/\r|\n|\s/g, ''));
}

//支持的loader配置
const LOADERS = {
    js: [
        function (code, file, options) {
            let opts = Object.assign({}, {
                compress: {
                    drop_console: true
                }
            }, options);

            return require('uglify-js').minify(code, opts).code;
        }
    ],

    scss: [
        function (code, file, opts, allOptions) {
            let options = {
                data: code,
                file,
                sourceMap: getCssSourceMapFile(opts, allOptions, file),
                outputStyle: opts.css && opts.css.outputStyle || 'compressed',
                importer: function (url, prev, done) {
                    let key = path.join(path.dirname(file), path.extname(url) ? url : `${url}.scss`);
                    if (!isOnlyImportScss(key) && !fileUtil.exist(key)) {
                        key = path.join(path.dirname(key), `_${path.basename(key)}`);
                    }
                    key = fileUtil.pathFormat(key);
                    scssImportArray[key] || (scssImportArray[key] = []);
                    scssImportArray[key].push(prev);
                    scssImportArray[key] = Array.from(new Set(scssImportArray[key]));
                }
            }
            let render =require('node-sass').renderSync(options);
            if(options.sourceMap){
                saveStyleSourceMap(options, render.map.toString());
            }
            return render.css.toString();
        }
    ],

    css: [
        function (code) {
            let options = {}
            let CleanCSS = require('clean-css');
            return new CleanCSS(options).minify(code).styles;
        }
    ]
}

const getExtName = (extname) => {
    let cssExts = ['scss'];
    if (cssExts.includes(extname)) {
        return 'css';
    }
    return extname;
}

//返回后缀名，并返回处理的loader
const fileLoader = (file, options) => {
    let ext = fileUtil.extname(file);
    let filename = path.basename(file, path.extname(file));
    let base = path.dirname(path.relative(options.base, file));
    let content = fs.readFileSync(file, {encoding: 'utf-8'});
    return {
        oldExt: ext,
        ext: getExtName(ext),
        base,
        content,
        filename,
        loader: LOADERS[ext] || []
    }
}

//根据frmame框架加载需要的插件支持
const PLUGINS = {
    angular: [
        function (content, file) {
            let options = {add: true};
            let res = require('ng-annotate')(content, options);
            if (res.errors) {
                logger.error(file, '编译出错：', res.errors.join('\r\n'));
            } else {
                return res.src;
            }
        }
    ]
}

//删除空目录
const removeEmptyDir = (dir, isCleanSelf) => {
    let stat = fs.lstatSync(dir);
    if (!stat.isDirectory()) return;
    let files = fs.readdirSync(dir);
    if (!files.length && isCleanSelf) fs.rmdirSync(dir);
    files.forEach(file => {
        removeEmptyDir(path.join(dir, file), true);
    });
}


/**
 * 压缩
 * @param options
 */
const compress = (options) => {
    //logger
    if (options.silent) logger.setSilent(options.silent);

    //处理options
    extendOptions(options);

    //需要处理的文件数组
    let filesArray = glob(options.files, options.exclude);

    // 对以_开头的scss文件进行过滤处理
    const fileArray = filesArray.filter(file => {
        return fileUtil.extname(file) !== 'scss' || !isOnlyImportScss(file);
    });

    let compressProgress = progress.create({auto: false, loadMessage: '....'}).start();

    let total = fileArray.length;

    const compileFile = (file) => {
        let {loader, base, content, ext, filename} = fileLoader(file, options);
        if (ext === 'js' && options.framework && PLUGINS[options.framework]) {
            let plugins = PLUGINS[options.framework] || [];
            plugins.forEach(plugin => {
                content = plugin(content, file);
            });
        }

        loader.forEach(ld => {
            content = ld(content, file, options.options || {}, options);
        });
        let fileNameFormat = typeof options.filename === 'string' ? options.filename
            : (options.filename[ext] ? options.filename[ext] : DEFAULT.filename);
        let dist = path.join(options.dist, base, fileNameFormat);
        dist = dist.replace(/\[name\]/g, filename).replace(/\[ext\]/g, ext);
        //创建目录
        fileUtil.createDir(dist);
        //写文件
        fs.writeFileSync(dist, content);
    }

    //处理编译的文件
    let currentFile;

    //重置
    scssImportArray = {};
    try {
        fileArray.forEach((file, index) => {
            currentFile = file;
            compressProgress.message(`正在压缩处理文件, 当前进度：${chalk.cyan((index + 1) + '/' + total)} .`);
            compileFile(file);
        });
    } catch (e) {
        compressProgress.finish();
        logger.error(currentFile, '编译出错', e.message);
    } finally {
    }

    //复制不需要编译的文件
    if (options.needCopy) {
        compressProgress.message(`正在整理文件，请稍后，即将开始复制文件`);
        // 忽略以_开头的scss文件
        let ignoreImportScss = path.join(options.src, '**/_*.scss');
        let files = glob([path.join(options.src, '**')], [path.join(options.dist, '**'), ignoreImportScss, ...fileArray]);
        total = files.length;
        try {
            files.forEach((file, index) => {
                currentFile = file;
                compressProgress.message(`正在复制文件，当前进度：${chalk.cyan((index + 1) + '/' + total)} .`)
                let filename = path.basename(file);
                let base = path.dirname(path.relative(options.base, file));
                let dist = path.join(options.dist, base, filename);
                fileUtil.createDir(dist);
                fs.createReadStream(file).pipe(fs.createWriteStream(dist, {encoding: 'utf-8'}));
            });
        } catch (e) {
            logger.error('复制', currentFile, '出错', e.message);
            compressProgress.finish();
        } finally {
            compressProgress.finish();
        }

    }
    compressProgress.finish();

    if (options.watch) {

        let watchArray = [...fileArray, ...Object.keys(scssImportArray)];

        const watchCompile = function (filepath) {
            filepath = fileUtil.pathFormat(filepath);
            try {
                if (scssImportArray.hasOwnProperty(filepath)) {
                    if(!isOnlyImportScss(filepath)){
                        compileFile(filepath);
                    }
                    let needReCompileFiles = scssImportArray[filepath];
                    needReCompileFiles.forEach(file => {
                        watchCompile(file);
                    });
                } else {
                    let extname = fileUtil.extname(filepath);
                    if(extname === 'scss'){
                        if(!isOnlyImportScss(filepath)) {
                            compileFile(filepath);
                        }
                    }else{
                        compileFile(filepath);
                    }
                }
            } catch (e) {
                logger.error('编译文件', filepath, '出错', e.message);
            }
        }

        gaze(watchArray, function () {

            // 监听新增的文件
            this.on('added', function (filepath) {
                logger.log('文件变化：', filepath);
                watchCompile(filepath);
            });

            // 监听改变的文件
            this.on('changed', function (filepath) {
                logger.log('文件变化：', filepath);
                watchCompile(filepath);
            });
        });
    }

}


/**
 * 清除压缩的文件
 * @param options
 */
const clean = (options) => {
    //logger
    if (options.silent) logger.setSilent(options.silent);

    //处理options
    extendOptions(options);

    //需要处理的文件数组
    const normalSrc = path.normalize(options.src);
    const normalDist = path.normalize(options.dist);
    let fileArray = [], dirs = [];
    let flag = normalDist.includes(normalSrc) || options.dist.includes(options.src);
    if (flag) {
        fileArray = glob([path.join(options.dist, '**')], []);
        dirs = glob([path.join(options.dist, '**')], [], {nodir: false});
    } else {
        fileArray = glob([path.join(options.dist, '**')], [path.join(options.src, '**')]);
        dirs = glob([path.join(options.dist, '**')], [path.join(options.src, '**')], {nodir: false});
    }

    fileArray.forEach((file, index) => {
        fs.unlinkSync(file);
    });

    // 删除空目录
    dirs = dirs.sort((a, b) => b.length - a.length);

    dirs.forEach((item, index) => {
        try {
            fs.rmdirSync(item);
        } catch (e) {

        }
    });
}

module.exports = {
    compress,
    clean
}
