

export default class webrtcConnection{
	constructor({offer, ice}){
		this.ice = ice;
		this.offer = offer;
		this.streams = [];
	}

	async connect(addStream){
		const pc = new RTCPeerConnection();

		const stream = await navigator.mediaDevices.getUserMedia({video: {height: 400 }, audio: false});
		addStream(stream);
		stream.getTracks().forEach(track => pc.addTrack(track, stream));

		await pc.setRemoteDescription(this.offer);
		const answer = await pc.createAnswer();

		await pc.setLocalDescription(answer);
		pc.addIceCandidate(new RTCIceCandidate(this.ice));

		return answer;
	}

	async addReciever({offer, ice}, addStream){
		const pc = new RTCPeerConnection();

		let sendedStream = null;
		pc.addEventListener('track', e => {
			if(e.streams[0] && e.streams[0] !== sendedStream){
				console.log('pc received remote stream');
				sendedStream = e.streams[0];
				addStream(e.streams[0]);
			}
		});

		await pc.setRemoteDescription(offer);
		const answer = await pc.createAnswer();

		await pc.setLocalDescription(answer);
		pc.addIceCandidate(new RTCIceCandidate(ice));

		return answer;
	}
}