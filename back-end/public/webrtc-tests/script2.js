const delay = d => new Promise((result, reject) => {
	setTimeout(result, d);
});

const socket = new WebSocket("ws://192.168.1.101");


async function createConnection(offer, ice){

	const cert = await RTCPeerConnection.generateCertificate({
	    name: 'ECDSA',
	    hash: 'SHA-256',
	    namedCurve: 'P-256'
	});

	const stream = await navigator.mediaDevices.getUserMedia({video: {height: 100 }, audio: false});

	console.log(stream);
	console.log(stream.getTracks());

	const pc = new RTCPeerConnection({certificates: [cert]});


	const pc2 = new RTCPeerConnection({certificates: [cert], iceCandidatePoolSize: 4});
	//stream.getTracks().forEach(track => pc2.addTrack(track, stream));

	const myoffer = await pc2.createOffer({
		offerToReceiveAudio: true, 
		offerToReceiveVideo : true,
	});

	stream.getTracks().forEach(track => pc.addTrack(track, stream));

	console.log(offer);

	await pc.setRemoteDescription(offer);
	const answer = await pc.createAnswer();

	await pc.setLocalDescription(answer);

	console.log(answer);

	socket.send(JSON.stringify({type: "answer", answer, myoffer}));

	const candidateRemote = new RTCIceCandidate(ice);

	pc.addIceCandidate(candidateRemote);
}

setTimeout(() => {
	socket.send(JSON.stringify({type: "ready"}));
}, 500);

socket.addEventListener('message', (event) => {
	const message = JSON.parse(event.data);

	if(message.type === 'offer')
		createConnection(message.offer, message.ice);
	
});

