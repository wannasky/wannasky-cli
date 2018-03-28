
const LOAD_PREFIX = ['-','\\','|','/'];

//获取stderr内容
const nextMessage = (index,loadMessage,repeatMessage,repeatTotal) => {
	index = index % repeatTotal;
	let prefix = LOAD_PREFIX[index % LOAD_PREFIX.length];
	return `${prefix}${loadMessage}${repeatMessage.repeat(index % repeatTotal)}`;
}

class Progress {

	constructor(options = {}){
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
		this.timer = setInterval(() => {
			this.stream.clearLine();
			this.stream.write(nextMessage(this.index, this.loadMessage, this.repeatMessage, this.repeatTotal));
			this.stream.cursorTo(0);
			this.index = this.index + 1;
			this.keep = this.keep + this.step;
			if(time && (this.keep > time)){
				 this.finish(callback);
			}
		}, this.step);
	}

	finish(callback) {
		this.stream.clearLine();
		clearInterval(this.timer);
		this.keep = 0;
		this.index = 0;
		if(callback) callback();
	}


}

exports.Progress = Progress;

exports.create = (options) => {
	return new Progress(options);
}
