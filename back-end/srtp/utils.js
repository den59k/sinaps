function readBit(uint, pos){
	pos = 7 - pos;
	return (uint & (1 << pos)) >> pos;
}

function readBits(uint, arr){
	let sum = 0;
	for(let pos of arr){
		sum = sum << 1;
		sum = sum | readBit(uint, pos);
	}
	return sum;
}

module.exports = { readBit, readBits };