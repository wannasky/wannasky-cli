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
        '^/5aV1bjqh_Q23odCf': 'https://ss0.bdstatic.com/'
    },

    //路由设置
    router: {

        '/router/:id': {
            get: (req, res, query) => {
                res.json({name:'wannasky'})
            }
        },

        '/wannasky/test': {
            post: (req, res, query) => {
                console.log('post query', query);
                res.json({success: true})
            }
        }
    }
}