const {contentType, handshakeType} = require('./constants');

class RecordLayer{
	type = 'HANDSHAKE'

	constructor(rec){
		if(rec){

			for(let key in contentType){
				if(contentType[key] === rec.type)
					this.type = key;
			}

			if(rec.epoch > 0)
				this.encoded = true;
		}
	}



}

class Handshake{
	constructor(rec){
		if(rec){
			for(let key in handshakeType){
				if(handshakeType[key] === rec.type)
					this.type = key;
			}

			this.sequence = rec.sequence;
		}
	}
}

module.exports = {
	RecordLayer, Handshake
}