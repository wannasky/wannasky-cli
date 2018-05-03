const {assert} = require('chai');

const compress = require('../lib/compress');

describe('compress测试', () => {

    const options = {

        //当src与dist相同时不执行copyothers
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
        }
    }

    it('#compress', () => {
        compress(options.compress);
    })

});
