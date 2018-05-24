const path = require('path');
const fs = require('fs');
const glob = require('./glob');
const progress = require('./progress');
const chalk = require('chalk');
const gaze = require('gaze');

const logger = require('./logger').createLogger({prefix: '@wans/cli/compress'});


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

//支持的loader配置
const LOADERS = {
    js: [
        function (code) {
            let options = {
                compress: {
                    drop_console: true
                }
            };
            return require('uglify-js').minify(code, options).code;
        }
    ],

    scss: [
        function (code) {
            let options = {
                data: code
            }
            return require('node-sass').renderSync(options).css.toString();
        },
        function (code) {
            let options = {}
            let CleanCSS = require('clean-css');
            return new CleanCSS(options).minify(code).styles;
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
    let ext = path.extname(file).replace(/^\./, '').toLowerCase();
    let filename = path.basename(file, path.extname(file));
    let base = path.dirname(path.relative(options.base, file));
    let content = fs.readFileSync(file, {encoding: 'utf-8'});
    return {
        ext: getExtName(ext),
        base,
        content,
        filename,
        loader: LOADERS[ext]
    }
}

//根据frmame框架加载需要的插件支持
const PLUGINS = {
    angular: [
        function (content) {
            let options = {add: true};
            let res = require('ng-annotate')(content, options);
            if (res.errors) {
                logger.error('使用ng-annotate插件报错', res.errors.join('\r\n'));
                process.exit();
            } else {
                return res.src;
            }
        }
    ]
}

//创建目录
const createFolder = (paths) => {
    let folders = path.dirname(paths).split(path.sep);
    let temp = '';
    while (folders.length) {
        temp += folders.shift() + path.sep;
        if (!fs.existsSync(temp)) {
            fs.mkdirSync(temp);
        }
    }
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
    const fileArray = glob(options.files, options.exclude);

    let compressProgress = progress.create({auto: false, loadMessage: '....'}).start();

    let total = fileArray.length;

    const compileFile = (file) => {
        let {loader, base, content, ext, filename} = fileLoader(file, options);
        if (ext === 'js' && options.framework && PLUGINS[options.framework]) {
            let plugins = PLUGINS[options.framework];
            plugins.forEach(plugin => {
                content = plugin(content);
            });
        }
        loader.forEach(ld => {
            content = ld(content);
        });
        let fileNameFormat = typeof options.filename === 'string' ? options.filename
            : (options.filename[ext] ? options.filename[ext] : DEFAULT.filename);
        let dist = path.join(options.dist, base, fileNameFormat);
        dist = dist.replace(/\[name\]/g, filename).replace(/\[ext\]/g, ext);
        //创建目录
        createFolder(dist);
        //写文件
        fs.writeFileSync(dist, content);
    }

    //处理编译的文件
    try {
        fileArray.forEach((file, index) => {
            compressProgress.message(`正在压缩处理文件, 当前进度：${chalk.cyan((index + 1) + '/' + total)} .`);
            compileFile(file);
        });
    } catch (e) {
        compressProgress.finish();
        logger.error(e.message);
        process.exit();
    } finally {
    }

    //复制不需要编译的文件
    if (options.needCopy) {
        let files = glob([path.join(options.src, '**')], [path.join(options.dist, '**'), ...fileArray]);
        total = files.length;
        try {
            files.forEach((file, index) => {
                compressProgress.message(`正在复制文件，当前进度：${chalk.cyan((index + 1) + '/' + total)} .`)
                let filename = path.basename(file);
                let base = path.dirname(path.relative(options.base, file));
                let dist = path.join(options.dist, base, filename);
                createFolder(dist);
                fs.createReadStream(file).pipe(fs.createWriteStream(dist, {encoding: 'utf-8'}));
            });
        } catch (e) {
            logger.error(e.message);
            compressProgress.finish();
            process.exit();
        } finally {
            compressProgress.finish();
        }

    }
    compressProgress.finish();

    if(options.watch){

        const watchCompile = function(filepath) {
            try{
                compileFile(filepath);
                logger.success('编译文件:',filepath);
            }catch (e) {
                logger.error(e.message);
            }
        }

        gaze(fileArray, function() {
            // 监听新增的文件
            this.on('added', function(filepath) {
                watchCompile(filepath);
            });

            // 监听改变的文件
            this.on('changed', function(filepath) {
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
    const fileArray = glob([path.join(options.dist, '**')], [path.join(options.src, '**')]);

    // 删除文件
    fileArray.forEach((file, index) => {
        fs.unlinkSync(file);
    });

    // 删除空目录
    let dirs = glob([path.join(options.dist, '**')], [path.join(options.src, '**')], {nodir: false});
    dirs = dirs.sort((a, b) => b.length - a.length);
    dirs.forEach(item => {
        try{
            fs.rmdirSync(item);
        }catch (e) {

        }
    });
}

module.exports = {
    compress,
    clean
}
