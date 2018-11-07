const {assert} = require('chai');

const Comp = require('../lib/core/compress');

const compress = Comp.compress;
const clean = Comp.clean;

describe('compress测试', () => {

    const options = {

        //当src与dist相同时不执行copyothers
        compress: {
            watch: true,
            src: './test/__test__/compress/src',
            dist: './test/__test__/compress/dist',
            // files: ['**/*.js', '/**/*.css', '**/*.scss'],
            files: ['**/*.scss','**/*.js'],
            exclude: ['/**/*.min.js', '/lib/**/*.js'],
            framework: ['angular'],
            filename: {
                'css': '../css/[name].[ext]',
                'js': '[name].min.[ext]'
            },
            options: {
                css: {
                    sourceMap: true
                }
            }
        }
    }

    it('#compress', () => {
        compress(options.compress);
    })

    it('#clean', function(done) {
        setTimeout(function () {
            //clean(options.compress);
            done();
        },1000);
    });
});



