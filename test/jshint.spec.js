const {assert} = require('chai');
const jshint = require('../lib/jshint');

describe('jshint测试', () => {

    let options = {
        silent: true,
        files: ['test/__test__/jshint/*.js'],
        exclude: ['test/__test__/jshint/b.js'],
        options: {
            eqeqeq: true,
            undef: true,
            globals: {
                console: true
            }
        }
    }

    it(`#文件a.js '$ is not defined'`, (done) => {
        jshint(options, (report => {
            let a = report['D:/workspace/github-workspace/@wannasky/cli/test/__test__/jshint/a.js'];
            assert.equal(a[0].line, 1);
            assert.include(a[0].reason, 'is not defined');
            done();
        }));
    });

    it(`#文件a.js '==检测出异常'`, (done) => {
        jshint(options, (report => {
            let a = report['D:/workspace/github-workspace/@wannasky/cli/test/__test__/jshint/a.js'];
            assert.equal(a[1].line, 4);
            assert.include(a[1].reason, '===');
            done();
        }));
    });

})
