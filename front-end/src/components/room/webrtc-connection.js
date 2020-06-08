

export default class webrtcConnection{
	constructor({offer, ice}){
		this.ice = ice;
		this.offer = offer;
		this.streams = [];
		this.connections = new Map();
	}

	async connect(addStream, {video, audio}){

		video = video===true? ({height: 200}):false;
		audio = audio === true;

		const pc = new RTCPeerConnection();

		const stream = await navigator.mediaDevices.getUserMedia({video, audio});

		const connection = { pc, stream }

		addStream(stream);

		stream.getTracks().forEach(track => pc.addTrack(track, stream));

		await pc.setRemoteDescription(this.offer);
		const answer = await pc.createAnswer();

		await pc.setLocalDescription(answer);
		pc.addIceCandidate(new RTCIceCandidate(this.ice));

		this.connections.set("__sender", connection);

		return answer;
	}

	async addReciever({offer, ice, user}, addStream){
		const pc = new RTCPeerConnection();

		const connection = { pc, stream: null }

		pc.addEventListener('track', e => {
			console.log(e);
			if(e.streams[0] && e.streams[0] !== connection.stream){
				console.log('pc received remote stream');
				connection.stream = e.streams[0];
				addStream(e.streams[0]);
			}
		});

		await pc.setRemoteDescription(offer);
		const answer = await pc.createAnswer();

		await pc.setLocalDescription(answer);
		pc.addIceCandidate(new RTCIceCandidate(ice));

		this.connections.set(user.login, connection);

		return answer;
	}

	close(){
		for(let c of this.connections.values()){
			c.pc.close();
			c.stream.getTracks().forEach(track => track.stop());
		}
	}

	remove(login){
		if(this.connections.has(login)){
			this.connections.get(login).pc.close();
			this.connections.get(login).stream.getTracks().forEach(track => track.stop());
		}
	}
}