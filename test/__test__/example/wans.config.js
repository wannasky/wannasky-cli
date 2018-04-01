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

    //
    mock: {

    },

    // local: {
    //     '/test': '../test'
    // },

    //路由设置
    router: {

        '/router/:id': {
            get: (req, res, query, mock) => {
                res.json(mock({
                    "status": 2000,
                    "message": "成功",
                    "total": mock.Link('result').length,
                    "result": mock.Array({
                        length: mock.Random(0,10),
                        item: mock.Object({
                            id: mock.AutoIncrement(0),
                            name: mock.String({prefix:'app-',maxLength:4,minLength:2}),
                            age: mock.Number(10,40),
                            date: mock.Date({start: '2018-03-03', end:'2018-07-23', format:'YYYY-MM-DD'}),
                            params: mock.Random([null, undefined, 2, 6]),
                            person: mock.Object({
                                name: mock.String({minLength:2, maxLength:4}),
                                male: mock.Random([true, false])
                            })
                        })
                    })
                }))
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
