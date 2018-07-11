const {assert} = require('chai');
const path = require('path');
const file = require('../lib/util/fileUtil');

describe('测试 lib/file.js', () => {

    describe('#filter()', () => {

        it('__test__/file目录总共有3个js文件', () => {
            let files = file.filter('test/__test__/file/', (stat, filePath) => {
                return path.extname(filePath) === '.js';
            });
            assert.equal(files.length, 3);
        });

        it('__test__/file根目录下有2个js文件', () => {
            let files = file.filter('test/__test__/file/', (stat, filePath) => {
                return path.extname(filePath) === '.js';
            }, false);
            assert.equal(files.length, 2);
        });

        it('__test__/file/a.js文件满足js文件过滤条件', () => {
            let files = file.filter('test/__test__/file/a.js', (stat, filePath) => {
                return path.extname(filePath) === '.js';
            });
            assert.equal(files.length, 1);
        });
    });

    describe('#has()', () => {

        it('__test__/file目录下有b.js', () => {
            assert.isTrue(file.has('test/__test__/file/', (stat, filePath, fileName) => {
                return fileName === 'b.js';
            }));
        })
    })

})
