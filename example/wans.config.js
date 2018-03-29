module.exports = {

    //端口号
    port: 8080,

    //根目录
    root: './',

    //代理设置
    proxy: {
        '^/5aV1bjqh_Q23odCf': {
            target: 'https://ss0.bdstatic.com/',
            headers: {}
        }
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