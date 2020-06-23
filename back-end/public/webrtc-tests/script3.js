const delay = d => new Promise((result, reject) => {
	setTimeout(result, d);
});

const socket = new WebSocket("ws://192.168.1.101");

const regIceUfrag = /ice-ufrag:\w+/g
const regIcePass = /ice-pwd:[\w\/\+]+/g
const regUfrag = /ice-ufrag:([\w\/\+]+)/
const regFingerprint = /fingerprint:[\w\-\: ]+/

async function start(){

	const cert = await RTCPeerConnection.generateCertificate({
	    name: 'ECDSA',
	    hash: 'SHA-256',
	    namedCurve: 'P-256'
	});

	const stream = await navigator.mediaDevices.getUserMedia({video: {height: 100 }, audio: false});

	const pc = new RTCPeerConnection({certificates: [cert]});
	const pc2 = new RTCPeerConnection({certificates: [cert]});

	stream.getTracks().forEach(track => pc.addTrack(track, stream));

	const offer = await pc.createOffer();

	pc.setLocalDescription(offer);

	await pc2.setRemoteDescription(offer);

	const answer = await pc2.createAnswer();

	socket.send(JSON.stringify({type: "offer", offer, answer}));

	socket.addEventListener('message', (event) => {
		const message = JSON.parse(event.data);

		if(message.type === 'answer'){
			console.log(message.answer);
			pc.setRemoteDescription(message.answer);

			const ufragRemote = regUfrag.exec(message.answer.sdp)[1];
			console.log(ufragRemote);
			const candidateRemote = new RTCIceCandidate({
				candidate: 'a=candidate:1111111111 1 udp 2043278322 192.168.1.101 3478 typ host',
				sdpMid: 0, 
				usernameFragment: ufragRemote});

			pc.addIceCandidate(candidateRemote);

		}


	}, {once: true});

	/**/
}

start();