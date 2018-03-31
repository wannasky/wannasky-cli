module.exports = {

    //没有日志输出
    silent: true,

    //端口号
    port: 8080,

    //根目录
    root: './test/__test__/example/public/',

    //代理设置
    proxy: {
        '/home/xman/': {
            target: 'https://www.baidu.com'
        }
    },

    // local: {
    //     '/test': '../test'
    // },

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
    },

    //测试json目录
    //当路由，代理，静态资源都获取不到时，再尝试获取.json后缀的文件
    testJsonDir: './__test__/json'
}
