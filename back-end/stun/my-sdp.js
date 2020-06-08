const sdp = require('sdp-transform');
const crypto = require('crypto');

class mySDP{

	constructor(certificate){

		this.ufrag = crypto.randomBytes(2).toString('hex');
		this.pwd = crypto.randomBytes(11).toString('hex');
		this.ssrcVideo = crypto.randomBytes(4).readUInt32BE(0);
		this.ssrcAudio = crypto.randomBytes(4).readUInt32BE(0);

		const hash = crypto.createHash('sha256');
		hash.write(certificate);
		const hex = hash.digest('hex').toUpperCase();
		let certFingerprint = '';

		for(let i = 0; i < hex.length; i+=2){
			if(certFingerprint !== '')
				certFingerprint += ':'
			certFingerprint += hex.substr(i, 2);
		}

		this.sdpObject = {
			version: 0,
			origin: {
				username: 'den',
				sessionId: '3497579305088229251',
				sessionVersion: 2,
				netType: 'IN',
				ipVer: 4,
				address: '127.0.0.1',
			},
			groups: [ { type: 'BUNDLE', mids: '0 1' } ],
			fingerprint:{
				type: 'sha-256',
				hash: certFingerprint
			},

			name: '-',
			timing: { start: 0, stop: 0 },
			iceOptions: 'trickle',
			msidSemantic: {semantic: 'WMS', token: '*'},
			media: [
			{
				rtp: [  {payload: 120, codec: 'VP8', rate: 90000 } ],
				fmtp: [ {payload: 120, config: 'max-fs=12288;max-fr=60'} ],
				type: 'video',
				port: 9,
				protocol: 'UDP/TLS/RTP/SAVPF',
				payloads: '120',
				connection: { version: 4, ip: '0.0.0.0' },
				direction: 'recvonly',
				ext: [],
				icePwd: this.pwd,
				iceUfrag: this.ufrag,
				mid: 0,
				rtcpFb: [ { payload: 120, type: 'nack' },
				{ payload: 120, type: 'nack', subtype: 'pli' },
				{ payload: 120, type: 'ccm', subtype: 'fir' },
				{ payload: 120, type: 'goog-remb' } ],
				rtcpMux: 'rtcp-mux',
				setup: 'actpass',
				ssrcs: [ { id: this.ssrcVideo, attribute: 'cname', value: '{534835a0-476e-41af-a7bb-63b30f7c643a}' } ]
			},
			{
				rtp: [  { payload: 109, codec: 'opus', rate: 48000, encoding: 2 } ],
				fmtp: [ { payload: 109, config: 'maxplaybackrate=48000;stereo=1;useinbandfec=1' } ],
				type: 'audio',
				port: 9,
				protocol: 'UDP/TLS/RTP/SAVPF',
				payloads: '109',
				connection: { version: 4, ip: '0.0.0.0' },
				direction: 'recvonly',
				ext: [],
				icePwd: this.pwd,
				iceUfrag: this.ufrag,
				mid: 1,
				rtcpMux: 'rtcp-mux',
				setup: 'actpass',
				ssrcs: [ { id: this.ssrcAudio, attribute: 'cname', value: '{534835a0-476e-41af-a7bb-63b30f7c643a}' } ]
			}
			]
		}

		this.sdp = sdp.write(this.sdpObject);

	}

}

module.exports = mySDP;