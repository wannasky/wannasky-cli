## @wannasky/cli
脚手架工具，以后慢慢维护，目前的功能有 wans server

### wans server

1. wans server config.js
   
   指定**config.js**配置文件启动，不知道调用根目录wans.config.js

2. wans server --help

    查看配置帮助信息
    

示例配置如下：
```javascript
module.exports = {

    //端口号
    port: 8080,

    //根目录
    root: './public',

    //本地静态资源路径重定向
    local: {
        '^/test/': '../test/',
    },

    //代理设置
    proxy: {
        '^/5aV1bjqh_Q23odCf': 'https://ss0.bdstatic.com/',
        '/api/test': {
            target: 'https://test.dyn.com',
            headers: {
                host: 'aa.cc.com'
            }
        }
    },

    //路由设置
    router: {

        '/router/:id': {
            get: (req, res, query) => {
                console.log('query', query);
                res.json({name:'wannasky'})
            }
        },

        '/wannasky/test': {
            post: (req, res, query) => {
                console.log('query', query);
                res.json({success: true})
            }
        }
    }
}
```

### LICENSE
[MIT](LICENSE)