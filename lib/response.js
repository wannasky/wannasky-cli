/**
 * 扩展response
 */

const union = require('union');
const fs = require('fs');
const path = require('path');
const mime = require('mime');

//renderUrl
union.ResponseStream.prototype.renderUrl = function (url) {
    let query = url.indexOf('?');
    if(query !== -1) url = url.slice(0,query);
    this.setHeader('Content-Type',mime.getType(url) + '; charset=utf-8');
    try{
        this.statusCode = 200;
        this.end(fs.readFileSync(path.resolve(url)));
    }catch (e){
        this.statusCode = 400;
    }finally {
        this.end();
    }
}