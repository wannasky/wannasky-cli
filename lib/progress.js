const LOAD_PREFIX = ['-', '\\', '|', '/'];

// 获取prefix
const getPrefix = (index, repeatTotal = 4) => {
    index = index % repeatTotal;
    return LOAD_PREFIX[index % LOAD_PREFIX.length];
}

//获取stderr内容
const nextMessage = (index, loadMessage, repeatMessage, repeatTotal) => {
    return `${getPrefix(index, repeatTotal)}${loadMessage}${repeatMessage.repeat(index % repeatTotal)}`;
}

class Progress {

    constructor(options = {}) {
        this.auto = options.auto === undefined ? true : options.auto;
        this.timer = null;
        this.index = 0;
        this.keep = 0;
        this.step = options.step || 200;
        this.stream = options.stream || process.stderr;
        this.repeatMessage = options.repeatMessage || '.';
        this.repeatTotal = options.repeatTotal || 5;
        this.loadMessage = options.loadMessage || 'loading';
    }

    start(time, callback) {
        let message = '';
        this.timer = setInterval(() => {
            if(this.auto){
                message = nextMessage(this.index, this.loadMessage, this.repeatMessage, this.repeatTotal);
            }else{
                message = this._currentMessage ? `${getPrefix(this.index)}${this._currentMessage}` : '';
            }
            this._print(message);
            this.index = this.index + 1;
            this.keep = this.keep + this.step;
            if (time && (this.keep > time)) {
                this.finish(callback);
            }
        }, this.step);
        return this;
    }

    finish(callback) {
        clearInterval(this.timer);
        this.stream.clearLine();
        this.keep = 0;
        this.index = 0;
        if (callback) callback();
    }

    message(text) {
        this._currentMessage = `${this.loadMessage}${text}`;
        let ms = `${getPrefix(this.index)}${this._currentMessage}`;
        this._print(ms);
    }

    _print(text) {
        this.stream.clearLine();
        this.stream.write(text);
        this.stream.cursorTo(0);
    }
}

exports.Progress = Progress;

exports.create = (options) => {
    return new Progress(options);
}
