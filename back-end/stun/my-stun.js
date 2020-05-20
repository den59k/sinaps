const stun = require ('stun');

function request(stunMessage, sdp){

	const request = stun.createMessage(stun.constants.STUN_BINDING_REQUEST);
	const outuser = `${sdp.iceUfrag}:${sdp.ufrag}`;
	request.addAttribute(stun.constants.STUN_ATTR_USERNAME, outuser);
	request.addAttribute(stun.constants.STUN_ATTR_USE_CANDIDATE);
	const tieBreaker = Buffer.from('ffaecc81e3dae860', 'hex');
	request.addAttribute(stun.constants.STUN_ATTR_ICE_CONTROLLING, tieBreaker);
	request.addAttribute(stun.constants.STUN_ATTR_PRIORITY, 2043278322);
	request.addMessageIntegrity(sdp.icePwd);
	request.addFingerprint();

	return request.toBuffer();

}

function response(stunMessage, sdp, address, port){

	const response = stun.createMessage(
        stun.constants.STUN_BINDING_RESPONSE,
        stunMessage.transactionId
  	);

  	response.addAttribute(
		stun.constants.STUN_ATTR_XOR_MAPPED_ADDRESS,
		address,
		port
  	);

  	response.addMessageIntegrity(sdp.pwd);
  	response.addFingerprint();

  	return response.toBuffer();
}

module.exports = {
	request, response
}