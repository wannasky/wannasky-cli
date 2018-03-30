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
        if(server) {
            server.close();
        }
    })

    describe('#访问静态资源',() => {

        it('访问index.html', (done) => {
            http.get('http://127.0.0.1:8080/index.html', (res) => {
                assert.equal(res.statusCode, 200);
                done();
            })
        });

        it('测试代理', (done) => {
            http.get('http://127.0.0.1:8080/home/xman/data/tipspluslist', res => {
                assert.include([200,302],res.statusCode);
                done();
            });
        });
    });
})
