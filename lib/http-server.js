const fs = require('fs'),
    path = require('path'),
    url = require('url'),
    union = require('union'),
    corser = require('corser'),
    ecstatic = require('ecstatic'),
    bodyParser = require('body-parser'),
    logger = require('./logger'),
    status = require('ecstatic/lib/ecstatic/status-handlers'),
    httpProxy = require('http-proxy');

require('./response');

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
    rule.split('/').forEach((item, index) => {
        if (item.indexOf(':') === 0) {
            param[index] = item.slice(1);
            regexp = regexp + '/(\\S+)';
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

//代理服务器
class HttpServer {

    constructor(options) {
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
                    fs.symlinkSync(srcPath, targetPath);
                }
            }
        }

        //代理设置
        if (options.proxy) {
            const proxy = options.proxy;
            let proxyServer = httpProxy.createServer({});
            before.push((req, res) => {
                let match = matchKey(proxy, req.url);
                let value = match ? match.value : false;
                if (value) {
                    try{
                        if (isString(value) && isUrl(value)) {
                            proxyServer.web(req, res, {target: value, secure: false});
                            logger.debug('代理匹配', `${req.url} => ${value}`);
                        } else if (isObject(value) && value.target && isString(value.target)) {
                            proxyServer.web(req, res, Object.assign({}, {secure: false}, value));
                            logger.debug('代理匹配', `${req.url} => ${value.target}`);
                        } else {
                            logger.error('代理配置不正确，执行 wans server --help 查看用法');
                            process.exit();
                        }
                    }catch(error){
                        logger.error(error.message);
                    }
                } else {
                    res.emit('next');
                }
            });
        }

        //添加body解析
        before.push((req, res) => {
            let contentType = req.headers['content-type'];
            if (contentType) {
                if (contentType.indexOf('application/json') !== -1) {
                    jsonParser(req, res, () => {
                        res.emit('next');
                    });
                } else if (contentType.indexOf('application/x-www-form-urlencoded') !== -1) {
                    urlParser(req, res, () => {
                        res.emit('next');
                    });
                } else {
                    res.emit('next');
                }
            } else {
                res.emit('next');
            }
        });

        //路由设置
        if (options.router) {
            before.push((req, res) => {
                let {key, value, param} = routerMatch(options.router, req.url);
                if (key) {
                    const method = req.method.toLowerCase();
                    if (value.hasOwnProperty(method)) {
                        res.statusCode = 200;
                        if (method === 'get' || method === 'delete') {
                            value[method](req, res, param);
                        } else if (method === 'post' || method === 'put') {
                            value[method](req, res, req.body);
                        }
                        logger.debug('路由匹配成功', key, req.method.toLowerCase());
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
            if (options.testJsonDir) {
                srcStatic(req, res, () => {
                    if (res.statusCode === 404) {
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
                            logger.debug('资源404，即将由',req.url, '=>', localUri);
                            srcStatic({url: localUri, headers: req.headers}, res);
                        } else {
                            status[res.statusCode](res);
                        }
                    } else {
                        status[res.statusCode](res);
                    }
                });
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