import React, { useState, useEffect, useRef } from 'react'
import { RippleButton } from './LoginInputs.jsx'
import { MdSentimentSatisfied, MdSend } from 'react-icons/md'
import { CssEmoji, ImgEmoji, findEmoji } from './emoji.jsx'

export default function Chat(props){

	const height = props.height || '50';
	const lineHeight = props.lineHeight || '25';

	const textInput = useRef(null);
	const [placeholder, setPlaceholder] = useState(true);
	const [emojiPanel, showEmojiPanel] = useState(false);

	const send = () => {
		let p = textInput.current;
		let str = "";
		let ch;
		while ((ch = p.firstChild) !== null) {
			if(ch.nodeType === Node.TEXT_NODE)
				str += ch.data;
			else{ 
				if(ch.tagName === 'IMG')
					str += ch.getAttribute('alt');
				if(ch.tagName === 'BR' && ch !== p.lastChild)
					str += "\n";
			}
			ch.remove();
		}

		props.send(str);

		checkPlaceholder();
	}

	const keyDown = e => {
		if(e.keyCode === 13 && !e.shiftKey){
			send();
			e.preventDefault();
		}
	}

	const checkPlaceholder = () => {
		const text = textInput.current;
		while(text.firstChild !== null && 
			(text.firstChild.tagName === 'BR' || text.firstChild.nodeValue === ' '))
			text.firstChild.remove();
	
		if(text.childNodes.length > 0 && placeholder)
			setPlaceholder(false);

		if(text.childNodes.length === 0 && !placeholder)
			setPlaceholder(true);
	}

	const paste = (e) => {
		e.preventDefault();
    var text = (e.originalEvent || e).clipboardData.getData('text/plain');
    pasteText(text);
	}

	const pasteText = (text) => {

		if(document.activeElement !== textInput.current){
			textInput.current.focus();
			let sel = document.getSelection();
			sel.selectAllChildren(textInput.current);
			sel.collapseToEnd();
		}

		text = text.replace(/\n/g, '<br/>')

		if(textInput.current.lastChild && textInput.current.lastChild.tagName === 'BR')
			textInput.current.lastChild.remove();
	   	
   for(let i = 0; i < text.length; i++){			//Чекнем на иконки
   		let code = text.charCodeAt(i);

   		if(code >= 0xD800 && code <= 0xDFFF){
   			
   			let em = findEmoji(text.charCodeAt(i+1));
   			if(em >= 0){
   				let img = ImgEmoji(em);
	   			text = text.substring(0, i) + img + text.substring(i+2);
	   			i+= img.length - 1;
	   		}else
	   			i++;
   			
   		}
   	}

    document.execCommand("insertHTML", false, text);
	}

	let timer = -1;
	const _showEmojiPanel = (e) => {
		if(e.buttons !== 0)
			return;
		if(timer > 0){
			clearTimeout(timer);
			timer = -1;
			return;
		}
		showEmojiPanel(true);
	}

	const _hideEmojiPanel = () => {
		if(timer < 0)
			timer = setTimeout(() => {
				showEmojiPanel(false);
				timer = -1;
			}, 200);
	}

	const style = {lineHeight: lineHeight+'px', padding: ((height-lineHeight)/2)+'px 4px', outline: 'none'};

	return (
		<div className={"chat " + props.className}>
			<div className="emoji-button" onMouseOver={_showEmojiPanel} onMouseOut={_hideEmojiPanel}>
				<RippleButton className={'transparent chat-button' + (emojiPanel?' orange': '')} >
					<MdSentimentSatisfied size="1.9em"/>
				</RippleButton>
				<EmojiPanel paste={pasteText} show={emojiPanel}/>
			</div>

			<div className="input">
				{placeholder && <div className="placeholder" style={style}>
					Введите сообщение...
				</div>}
				<div 	ref={textInput} 
							contentEditable={true} 
							style={style} 
							onInput={checkPlaceholder} 
							onPaste={paste}
							spellCheck={false}
							onKeyDown={keyDown}></div>
			</div>

			<RippleButton className={'transparent chat-button send'+(placeholder?' closed': '')} onClick={send}>
				<MdSend size="1.9em" style={{transform: 'translateX(2px)'}}/>
			</RippleButton>

		</div>
	);
}

function EmojiPanel (props) {

	const [className, setClassName] = useState(' closed');

	useEffect(() => {
		const show = props.show;

		if(show){
			setClassName(' open');

			setTimeout(() => setClassName(' open-active'), 20);
		}else{
			setClassName(' close-active');
			let timerID = setTimeout(() => setClassName(' closed'), 250);
			return () => {
				clearTimeout(timerID);
			}
		}
	}, [props.show]);

	const getEmojiRow = () => {
		let content = []
		for(let i = 0; i < 189; i++){
			content.push(<CssEmoji emoji = {i} paste={props.paste} key={i}/>);
		}

		return content;
	}

	return (
		<div className={'emoji-panel ' + className}>
			<div className="list-emoji-panel" style={{top: '7px'}}>
				{getEmojiRow()}
			</div>
		</div>
	);
}