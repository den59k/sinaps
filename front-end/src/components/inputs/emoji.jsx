import React from 'react'

let emojiTable = [
	'😄😃😀😊😏😉😍😘😚😗😙😜😝😛😳😬😔😌😒😞😣😢😂😭😪😥😰'
];

export function findEmoji(code){
	for(let i = 0; i < emojiTable.length; i++)
		for(let j = 0; j < 27; j++){
			if(emojiTable[i].charCodeAt(j*2+1) === code)
				return i*27+j;
		}

	return -1;
}

export function ImgEmoji(emoji){
	//return <span class='emoji-pattern'></span>
	let x = emoji % 27;
	let y = emoji/27|0;
	return `<img class="emoji" src = "/static/split/image_${y+1}_${x+1}.png" alt="${emojiTable[0].substr(x*2, 2)}"/>`
}

export function CssEmoji(props){

	let x = props.emoji % 27;
	let y = props.emoji/27|0;
	let pos = -x*18 + 'px ' + -y * 18 + 'px';

	const text = emojiTable[0].substr(x*2, 2);

	return (
		<span className="emoji-pattern-wrapper" 
				onMouseDown={(e) => {
					e.preventDefault();
					props.paste(text);
				}}>
			<span className='emoji-pattern' style={{backgroundPosition: pos}} >{}</span>
		</span>
		);

}