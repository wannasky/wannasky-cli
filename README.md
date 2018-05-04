## @wannasky/cli
脚手架工具，以后慢慢维护

### wans server

1. wans server config.js
   
   指定**config.js**配置文件启动，不指定调用根目录wans.config.js

2. wans server --help

    查看配置帮助信息
    
    
### wans jshint

1. wans jshint config.js
   
   指定**config.js**配置文件启动，不指定调用根目录wans.config.js

2. wans jshint --help

    查看配置帮助信息
    
### wans compress

1. wans compress config.js
   
   指定**config.js**配置文件启动，不指定调用根目录wans.config.js

2. wans compress --help

    查看配置帮助信息

示例配置如下：
```javascript
module.exports = {

    //端口号
    port: 8080,

    //根目录
    root: './public',
    
    //jshint配置
    jsHint: {
        files: ['src/test/**/*.js', 'src/index.js'],
        exclude: ['src/test/**/*.spec.js', 'src/test/**/*.min.js'],
        options: {
            eqeqeq: true
            //...
        }
    },
    
    //压缩相关配置
    compress: {
        src: './test/__test__/compress/src',
        dist: './test/__test__/compress/dist',
        files: ['**/*.js', '/**/*.css', '**/*.scss'],
        exclude: ['/**/*.min.js', '/lib/**/*.js'],
        framework: ['angular'],
        filename: {
            'css': '../css/[name].[ext]',
            'js': '[name].min.[ext]'
        }
    },

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
            get: (req, res, query, mock) => {
                console.log('query', query);
                res.json(mock(mock.object({
                    name: 'wannasky',
                    age: 25,
                    books: mock.array({
                        length: mock.random(5, 10),
                        item: mock.object({
                            title: mock.text('book-', mock.index),
                            isbn: mock.random(1000, 2000, true)
                        })
                    })
                })))
            }
        },

        '/wannasky/test': {
            post: (req, res, query, mock) => {
                console.log('query', query);
                res.json({success: true})
            }
        }
    },
    
    //测试json目录
    //当路由，代理，静态资源都获取不到时，再尝试获取.json后缀的文件
    testJsonDir: './__test__/json'
}
```

### LICENSE
[MIT](LICENSE)
