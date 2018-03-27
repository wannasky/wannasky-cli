const path = require('path'),
    union = require('union'),
    corser = require('corser'),
    ecstatic = require('ecstatic'),
    bodyParser = require('body-parser'),
    httpProxy = require('http-proxy');

require('../lib/response');

const jsonParser = bodyParser.json();
const urlParser = bodyParser.urlencoded({ extended: false });

//isString
const isString = (string) => {
    return Object.prototype.toString.call(string) === '[object String]';
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
    for (let i = 0, l = keys.length; i < l; i++) {
        let regexp = createRegExp(keys[i]);
        if(regexp.test(string)){
            if(isString(object[keys[i]])){
                if(isUrl(object[keys[i]])){
                    result = object[keys[i]];
                }else{
                    result = path.join(object[keys[i]], string.replace(regexp, ''));
                }
            }else{
                result = object[keys[i]];
            }
            break;
        }
    }
    return result;
}

//判断是否串是否以http/https开头
const isUrl = (string) => {
    return /^(http:|https:)+/.test(string);
}

//简单判断url是否具有后缀名
const hasExtension = (url) => {
    return /(\.(\w+)\?)|(\.(\w+)$)/.test(url);
}

const generateRegexpExtend = (rule) => {
    if(rule.indexOf('/') === 0){
        rule = rule.slice(1);
    }
    if(rule.lastIndexOf('/') === (rule.length - 1)){
        rule = rule.slice(0, -1);
    }
    let regexp = '';
    let param = {};
    rule.split('/').forEach((item, index) => {
        if(item.indexOf(':') === 0){
            param[index] = item.slice(1);
            regexp = regexp + '/(\\S+)';
        }else{
            regexp = regexp +'/' + item;
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
    for(let i=0,l=keys.length;i<l;i++){
        let {regexp, param}  = generateRegexpExtend(keys[i]);
        let match = url.match(regexp);
        if(match) {
            result.key = keys[i];
            result.value = router[keys[i]];
            let params = {};
            for(let key in param){
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
        this.headers = options.headers = {};
        this.cors = !!options.cors;
        if (this.cors) {
            this.headers['Access-Control-Allow-Origin'] = '*';
            this.headers['Access-Control-Allow-Headers'] = 'Origin, X-Requested-With, Content-Type, Accept, Range';
            before.push(corser.create(null));
        }
        before.push(ecstatic({
            root: this.root
        }));

        function loop(object) {

        }

        function isFunction(object) {
            return Object.prototype.toString.call(object) === '[object Function]';
        }

        function isObject(object) {
            return Object.prototype.toString.call(object) === '[object Object]';
        }

        //添加body解析
        before.push(
            function (req, res) {
                let contentType = req.headers['content-type'];
                if(contentType){
                    if(contentType.indexOf('application/json') !== -1){
                        jsonParser(req, res, () => {
                            res.emit('next');
                        });
                    }else if(contentType.indexOf('application/x-www-form-urlencoded') !== -1){
                        urlParser(req, res, () => {
                            res.emit('next');
                        });
                    }else{
                         res.emit('next');
                    }
                }else{
                    res.emit('next');
                }
            }
        )

        //代理server
        let proxyServer = httpProxy.createServer({});

        //本地静态资源重定向
        if(options.local) {
            before.push((req, res) => {
                let target = matchKey(options.local, req.url);
                if(target){
                    if(isUrl(target)){
                        proxyServer.web(req, res, {target: target, changeOrigin: true});
                        logger.debug('静态资源重定向',req.url ,'=>',path.join(target, req.url));
                    }else{
                        if(hasExtension(target)){
                            let resolvePath = path.resolve(options.root, target);
                            res.renderUrl(resolvePath);
                            logger.debug('静态资源重定向',req.url ,'=>',resolvePath);
                        }else{
                            res.emit('next');
                        }
                    }
                }else{
                    res.emit('next');
                }
            });
        }

        //代理设置
        if (options.proxy) {
            const proxy = options.proxy;
            before.push((req, res) => {
                let target = matchKey(proxy, req.url);
                if(target){
                    if(isString(target)){
                        //代理
                        if(isUrl(target)){
                            proxyServer.web(req, res, {target: target, changeOrigin: true});
                            logger.debug('代理服务启动',req.url ,'=>',path.join(target, req.url));
                        }else{
                            logger.error('代理必须以http:// 或者 https://开头');
                            res.emit('next');
                        }
                    }else{
                        logger.error('代理设置Value必须为字符串');
                    }
                }else{
                    res.emit('next');
                }
            });
        }

        //路由设置
        if(options.router){
            before.push((req, res) => {
                let {key, value, param} = routerMatch(options.router, req.url);
                if(key) {
                    const method = req.method.toLowerCase();
                    if(value.hasOwnProperty(method)){
                        res.statusCode = 200;
                        if(method === 'get' || method === 'delete'){
                            value[method](req, res, param);
                        }else if(method === 'post' || method === 'put'){
                            value[method](req, res, req.body);
                        }
                        logger.debug('路由匹配成功',key, req.method.toLowerCase());
                    }else{
                        res.emit('next');
                    }
                }else{
                    res.emit('next');
                }
            });
        }

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