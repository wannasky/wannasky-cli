const {assert} = require('chai');
const http = require('http');
const httpServer = require('../lib/http-server');

describe('测试 lib/http-server.js', () => {

    const options = require('../test/__test__/example/wans.config.js');

    let server;
    before((done) => {
        server = httpServer.createServer(options);
        server.listen(options.port, '127.0.0.1', () => {
            done();
        });
    });

    after(() => {
        if (server) {
            server.close();
        }
    })

    describe('#访问静态资源', () => {

        it('访问 http://127.0.0.1:8080/index.html', (done) => {
            http.get('http://127.0.0.1:8080/index.html', (res) => {
                assert.equal(res.statusCode, 200);
                done();
            })
        });

    });

    describe('#测试代理', () => {

        it('测试代理 /home/xman/ => https://www.baidu.com', done => {
            http.get('http://127.0.0.1:8080/home/xman/data/tipspluslist', res => {
                assert.include([200, 302], res.statusCode);
                done();
            });
        });
    });

    describe('#测试路由', () => {

        it('发送get请求至http://127.0.0.1:8080/router/123', done => {

            http.get('http://127.0.0.1:8080/router/123', (res) => {
                let chunks = '';
                res.on('data', chunk => {
                    chunks += chunk;
                });
                res.on('end', () => {
                    let data = JSON.parse(chunks);
                    assert.include(data, {name: 'wannasky'});
                    done();
                });
                res.on('error', (error) => {
                    done(error);
                })
            });
        });
    });

    //跳过测试，因为需要管理员权限操作
    describe.skip('#测试本地软链接', () => {

    });

    //添加mock支持
    describe('#自定义mock数据测试', () => {

        it('发送get请求至http://127.0.0.1:8080/module/test', done => {
            http.get('http://127.0.0.1:8080/module/test', (res) => {
                let chunks = '';
                res.on('data', chunk => {
                    chunks += chunk;
                });
                res.on('end', () => {
                    let data = JSON.parse(chunks);
                    assert.equal(data.status, 200);
                    assert.isAtLeast(data.list.length,5);
                    done();
                });
                res.on('error', (error) => {
                    done(error);
                })
            });
        })
    });
})
