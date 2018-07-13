const fs = require('fs'),
    path = require('path'),
    url = require('url'),
    union = require('union'),
    corser = require('corser'),
    ecstatic = require('ecstatic'),
    bodyParser = require('body-parser'),
    status = require('ecstatic/lib/ecstatic/status-handlers'),
    mock = require('@wannasky/mock'),
    httpProxy = require('http-proxy'),
    mime = require('mime'),
    zlib = require('zlib'),
    crypto = require('crypto'),
    querystring = require('querystring'),
    fileUtil = require('../util/fileUtil');

require('../response');

let logger = require('../util/logger');

const TEST_JSON_RELATION = 'manifest.json';

const jsonParser = bodyParser.json();
const urlParser = bodyParser.urlencoded({extended: false});


//isString
const isString = (string) => {
    return Object.prototype.toString.call(string) === '[object String]';
}

//isObject
const isObject = (object) => {
    return Object.prototype.toString.call(object) === '[object Object]';
}

const isSimpleEqual = (o1, o2) => {
    if(o1 === o2) return true;
    if(o1 == null || o2 == null) return o1 === o2;
    let o1Type = Object.prototype.toString.call(o1);
    let o2Type = Object.prototype.toString.call(o2);
    if(o1Type !== o2Type) return false;
    if(o1Type === '[object Object]'){
        let o1Prop = Object.getOwnPropertyNames(o1),
            o2Prop = Object.getOwnPropertyNames(o2);
        if(o1Prop.length !== o2Prop.length) return false;
        for(let i=0;i<o1Prop.length;i++){
            let propName=o1Prop[i];
            if(o1[propName] !== o2[propName]) return false;
        }
        return true;
    }
    return o1 === o2;
}

//修复正则表达式
const createRegExp = (rule) => {
    return new RegExp(rule);
}

//匹配对象的key
//返回value
const matchKey = (object, string) => {
    let result;
    const keys = Object.keys(object);
    let _len = 0;
    for (let i = 0, l = keys.length; i < l; i++) {
        let regexp = createRegExp(keys[i]);
        let match = string.match(regexp);
        if (match) {
            if (keys[i].length > _len) {
                result = {key: keys[i], value: object[keys[i]]};
                _len = keys[i].length;
            }
        }
    }
    return result;
}

//判断是否串是否以http/https开头
const isUrl = (string) => {
    return /^(http:|https:)+/.test(string);
}

const generateRegexpExtend = (rule) => {
    if (rule.indexOf('/') === 0) {
        rule = rule.slice(1);
    }
    if (rule.lastIndexOf('/') === (rule.length - 1)) {
        rule = rule.slice(0, -1);
    }
    let regexp = '';
    let param = {};
    let sindex = 0;
    rule.split('/').forEach((item, index) => {
        if (item.indexOf(':') === 0) {
            param[++sindex] = item.slice(1);
            // regexp = regexp + '/(\\S+)';
            regexp = regexp + '/(\[^/]+)';
        } else {
            regexp = regexp + '/' + item;
        }
    });
    regexp = new RegExp(regexp);
    return {
        regexp,
        param
    };
}

//路由匹配
const routerMatch = (router, url) => {
    let result = {};
    const keys = Object.keys(router);
    for (let i = 0, l = keys.length; i < l; i++) {
        let {regexp, param} = generateRegexpExtend(keys[i]);
        let match = url.match(regexp);
        if (match) {
            result.key = keys[i];
            result.value = router[keys[i]];
            let params = {};
            for (let key in param) {
                params[param[key]] = match[key];
            }
            result.param = params;
            break;
        }
    }
    return result;
}

// 用于比较代理和自定义路由的优先级
const isHighWeight = function (url, method, proxy, router) {
    if (!proxy) return false;
    if (!router) return true;
    let {key, value} = routerMatch(router, url);
    if (!key) return true;
    if (!value.hasOwnProperty(method.toLowerCase())) return true;
    let proxyLen = path.normalize(proxy.key).replace(/\\/g, '/').match(/^\/?([\s\S]+?)\/?$/)[1].split('/').length;
    let routeLen = path.normalize(key).replace(/\\/g, '/').match(/^\/?([\s\S]+?)\/?$/)[1].split('/').length;
    if (routeLen >= proxyLen) return false;
    return true;
}

// looparray
const loopArray = function (array, cb) {
    if(array.length){
        let func = array.shift();
        cb(func);
        loopArray(array, cb);
    }
}

const getFileKey = function(query){
    if(!query || !Object.keys(query).length) return 'default';
    let keysArray = Object.keys(query).sort();
    let md5 = crypto.createHash("md5");
    let string =  keysArray.reduce((pre, post) => {
        return (query[pre] ? query[pre] : '').toString() + '&' + (query[post] ? query[post] : '').toString();
    });
    return md5.update(string).digest('hex');
}

// 报错映射关系
const saveFileRelation = function (file, options) {
    let filepath = path.resolve(path.join(options.base, TEST_JSON_RELATION));
    let content = {};
    if(fileUtil.exist(filepath)){
        content = require(filepath);
    }else{
        fileUtil.createDir(filepath);
    }
    content[options.pathname] = content[options.pathname] || {};
    content[options.pathname][options.method] = content[options.pathname][options.method] || {};
    content[options.pathname][options.method].url = options.pathname;
    content[options.pathname][options.method].method = options.method;
    content[options.pathname][options.method].files = content[options.pathname][options.method].files || {};
    content[options.pathname][options.method].files[options.fileKey] = {
        query: options.query,
        file: file
    }
    fileUtil.writeFileSync(filepath, JSON.stringify(content));
}

// 报存代理后的数据及映射关系
let debounceTimer = null, funcArray = [];
const saveProxyData = function (req, data, contentType, options) {
    let urlParse = url.parse(req.url);
    urlParse.base = options.testJsonDir;
    urlParse.method = req.method;
    urlParse.query = ['POST', 'PUT'].includes(req.method) ? req.body : querystring.parse(urlParse.query);
    let file = path.resolve(path.join(options.testJsonDir, urlParse.pathname));
    if(!path.extname(file).length) {
        if (file.lastIndexOf(path.sep) === file.length - 1) {
            file = file.slice(0, -1);
        }
        let extname = contentType ? mime.getExtension(contentType) : 'json';
        urlParse.fileKey = getFileKey(urlParse.query);
        file = file + '-' + urlParse.fileKey +'.' + extname;
    }else{
        urlParse.fileKey = getFileKey();
    }
    fileUtil.createDir(file);
    let func = (function(f, d, options){
        return function(){
            fileUtil.writeFileSync(f, d);
            saveFileRelation(f, options);
        }
    })(file, data, urlParse);
    funcArray.push(func);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
        loopArray(funcArray, function(item){
            item();
        });
    },10);
}

//代理服务器
class HttpServer {

    constructor(options) {
        logger = logger.createLogger({prefix: '@wans/cli/server', silent: options.silent, level: options.level});
        let before = [];
        this.port = options.port;
        this.root = options.root;
        this.cache = options.cache === undefined ? 0 : options.cache;
        this.headers = options.headers || {};
        this.cors = !!options.cors;
        if (this.cors) {
            this.headers['Access-Control-Allow-Origin'] = '*';
            this.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Range';
            before.push(corser.create(null));
        }

        // 读取manifest
        if(options.testJsonDir && options.useManifest){
            this.manifest = require(path.resolve(path.join(options.testJsonDir, TEST_JSON_RELATION)));
        }

        //本地静态资源通过软链接处理
        if (options.local) {
            const base = process.cwd();
            let targetPath, srcPath;
            let local = options.local;
            for (let key in local) {
                targetPath = path.normalize(path.join(base, options.root, key));
                srcPath = path.isAbsolute(local[key]) ? path.normalize(local[key]) : path.normalize(path.join(base, options.root, local[key]));
                try {
                    fs.accessSync(srcPath);
                } catch (error) {
                    logger.error(srcPath, '资源不存在');
                    process.exit();
                }

                try {
                    fs.readlinkSync(targetPath);
                } catch (error) {
                    fs.symlinkSync(srcPath, targetPath, 'dir');
                }
            }
        }

        //添加body解析
        //这里的body解析为异步
        before.push((req, res) => {
            let contentType = req.headers['content-type'];
            if (contentType) {
                if (contentType.indexOf('application/json') !== -1) {
                    jsonParser(req, res, () => {});
                } else if (contentType.indexOf('application/x-www-form-urlencoded') !== -1) {
                    urlParser(req, res, () => {});
                }
            }
            res.emit('next');
        });

        //代理设置
        if (options.proxy && !options.useManifest) {
            const proxy = options.proxy;
            let proxyServer = httpProxy.createServer({});
            proxyServer.on('error', (error) => {
                logger.error('代理出错：', error);
            });
            if(options.proxySave && options.testJsonDir){
                proxyServer.on('proxyRes', (proxyRes, req, res) => {
                    let body = new Buffer('');
                    proxyRes.on('data', function (data) {
                        body = Buffer.concat([body, data]);
                    });
                    proxyRes.on('end', function () {
                        switch (proxyRes.headers['content-encoding']) {
                            case 'gzip':
                            case 'deflate':
                                zlib.unzip(body, function (error, buffer) {
                                    saveProxyData(req, buffer, res.headers['content-type'], options);
                                });
                                break;
                            default:
                                saveProxyData(req, body, res.headers['content-type'], options);
                                break;
                        }

                    });
                });
            }
            before.push((req, res) => {
                let match = matchKey(proxy, req.url);
                let value = match ? match.value : false;
                if (value && isHighWeight(req.url, req.method, match, options.router)) {
                    try {
                        if (isString(value) && isUrl(value)) {
                            proxyServer.web(req, res, {target: value, secure: false});
                            logger.log('代理匹配', `${req.url} => ${value}`);
                        } else if (isObject(value) && value.target && isString(value.target)) {
                            proxyServer.web(req, res, Object.assign({}, {secure: false}, value));
                            logger.log('代理匹配', `${req.url} => ${value.target}`);
                        } else {
                            logger.error('代理配置不正确，执行 wans server --help 查看用法');
                            process.exit();
                        }
                    } catch (error) {
                        logger.error(error.message);
                    }
                } else {
                    res.emit('next');
                }
            });
        }

        //路由设置
        if (options.router) {
            before.push((req, res) => {
                let {key, value, param} = routerMatch(options.router, req.url);
                if (key) {
                    const method = req.method.toLowerCase();
                    if (value.hasOwnProperty(method)) {
                        req.on('end', () => {
                            res.statusCode = 200;
                            if (method === 'get' || method === 'delete') {
                                value[method](req, res, param, mock);
                            } else if (method === 'post' || method === 'put') {
                                value[method](req, res, Object.assign({}, param, req.body), mock);
                            }
                            logger.debug('路由匹配成功', key, req.method.toLowerCase());
                        });
                    } else {
                        res.emit('next');
                    }
                } else {
                    res.emit('next');
                }
            });
        }

        let srcStatic = ecstatic({
            root: this.root,
            cache: this.cache,
            showDir: true,
            autoIndex: true
        });

        //静态资源
        before.push((req, res) => {
            if (options.testJsonDir && !options.useManifest) {
                srcStatic(req, res, () => {
                    if (res.statusCode === 404 || res.statusCode === 405) {
                        let pathName = url.parse(req.url).pathname;
                        if (!path.extname(pathName).length) {
                            let localUri = path.join('/', options.testJsonDir, pathName);
                            localUri = localUri.replace(/\\/g, '/').split('/')
                                .map(item => decodeURIComponent(item)).join('/');
                            if (localUri.lastIndexOf('/') === localUri.length - 1) {
                                localUri = localUri.slice(0, -1);
                            }
                            //此处当然为 .json啦
                            localUri = localUri + '.json';
                            logger.debug('资源404，即将由', req.url, '=>', localUri);
                            srcStatic({url: localUri, headers: req.headers}, res);
                        } else {
                            status[res.statusCode](res);
                        }
                    } else {
                        status[res.statusCode](res);
                    }
                });
            } else if(options.testJsonDir && options.useManifest){
                let urlParse = url.parse(req.url);
                let pathname = urlParse.pathname;
                if(this.manifest[pathname] && this.manifest[pathname][req.method]){
                    let invoke = this.manifest[pathname][req.method];
                    req.on('end', () => {
                        let query = ['POST', 'PUT'].includes(req.method) ? req.body : querystring.parse(urlParse.query);
                        let fileKey = getFileKey(path.extname(pathname).length ? '' : query);
                        if(invoke.files && invoke.files[fileKey]){
                            res.renderUrl(invoke.files[fileKey].file);
                        }else{
                            srcStatic(req, res);
                        }
                    });
                }else{
                    srcStatic(req, res);
                }
            } else {
                srcStatic(req, res);
            }
        });

        let serverOptions = {
            before: before,
            buffer: false,
            headers: this.headers,
            onError: (error, req, res) => {
                logger.error(req.url, error.message);
                res.end();
            }
        }
        if (options.ssl) {
            serverOptions.https = options.ssl;
        }

        this.server = union.createServer(serverOptions);
    }

    listen() {
        this.server.listen.apply(this.server, arguments);
    }

    close() {
        return this.server.close();
    }
}


exports.HttpServer = HttpServer;

exports.createServer = (options) => {
    return new HttpServer(options);
}
