console.log('hello');

const delay = d => new Promise((result, reject) => {
	setTimeout(result, d);
});


async function start(){

	const cert = await RTCPeerConnection.generateCertificate({
	    name: 'ECDSA',
	    hash: 'SHA-256',
	    namedCurve: 'P-256'
	});

	const stream = await navigator.mediaDevices.getUserMedia({video: {height: 400 }, audio: true});

	console.log(stream);
	console.log(stream.getTracks());

	document.querySelector('video.local').srcObject = stream;

	const pc = new RTCPeerConnection({certificates: [cert]});
	const pc2 = new RTCPeerConnection({certificates: [cert]});

	const pc3 = new RTCPeerConnection({certificates: [cert]});
	const _pc = new RTCPeerConnection({certificates: [cert]});

	const reg = /ice-ufrag:(\w+)/
	const fingerprint = /fingerprint:[\w\-\: ]+/

	pc.addEventListener('track', e => {
		if (document.querySelector('video.remote').srcObject !== e.streams[0]) {
			document.querySelector('video.remote').srcObject = e.streams[0];

			console.log('pc2 received remote stream');
			console.log(e.streams[0]);
			console.log(e.streams[0].getTracks());
		}
	});

	//pc.addEventListener('icecandidate', e => onIceCandidate(pc2, e));
	stream.getTracks().forEach(track => pc2.addTrack(track, stream));

	const offer = await pc.createOffer({
		offerToReceiveVideo : true,
		offerToReceiveAudio : true
	});

	console.log(offer.sdp);

	pc.setLocalDescription(offer);
	pc2.setRemoteDescription(offer);

	const answer = await pc2.createAnswer(offer);

	console.log(answer.sdp);

	pc2.setLocalDescription(answer);
	pc.setRemoteDescription(answer);

	const fingerprintOffer = fingerprint.exec(offer.sdp)[0];
	const fingerprintAnswer = fingerprint.exec(answer.sdp)[0];

	//console.log(offer.sdp);
	console.log(fingerprintOffer);
	console.log(fingerprintAnswer);
	//answer3.sdp = answer3.sdp.replace(fingerprint, fingerprintAnswer);

	const iceUfrag = /ice-ufrag:\w+/g
	const icePass = /ice-pwd:[\w\/\+]+/g

	const ufragLocal = reg.exec(offer.sdp)[1];
	const ufragRemote = reg.exec(answer.sdp)[1];

	const _iceUfrag = iceUfrag.exec(answer.sdp)[0];
	const _icePass = icePass.exec(answer.sdp)[0];

	console.log(_icePass);

	const candidateRemote = new RTCIceCandidate({
		candidate: 'a=candidate:1111111111 1 udp 2043278322 192.168.1.101 3478 typ host',
		sdpMid: 0, 
		usernameFragment: ufragRemote});



	const candidateLocal = new RTCIceCandidate({
		candidate: 'a=candidate:1111111111 1 udp 2043278322 192.168.1.101 3478 typ host',
		sdpMid: 0, 
		usernameFragment: ufragLocal});

	//await delay(2000);

	pc2.addIceCandidate(candidateLocal);

	//await delay(500);

	pc.addIceCandidate(candidateRemote);

}

start();