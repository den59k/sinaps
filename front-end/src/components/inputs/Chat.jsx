import React, { useState, useEffect } from 'react'
import { RippleButton } from './LoginInputs.jsx'
import { MdSentimentSatisfied, MdSend } from 'react-icons/md'
import { CssEmoji, ImgEmoji, findEmoji } from './emoji.jsx'

export default class Chat extends React.Component{

	constructor(props) {
		super(props);
		this.height = props.height || '50';
		this.lineHeight = props.lineHeight || '25';
		this.textInput = React.createRef();

		this.state = {placeholder: true, emojiPanel: false}
	}

	send = () => {
		let p = this.textInput.current;
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

		this.props.send(str);

		this.checkPlaceholder();
	}

	keyDown = e => {
		if(e.keyCode === 13 && !e.shiftKey){
			this.send();
			e.preventDefault();
		}
	}

	checkPlaceholder = () => {
		const text = this.textInput.current;
		while(text.firstChild !== null && 
			(text.firstChild.tagName === 'BR' || text.firstChild.nodeValue === ' '))
			text.firstChild.remove();
	
		if(text.childNodes.length > 0 && this.state.placeholder)
			this.setState({placeholder: false});

		if(text.childNodes.length === 0 && !this.state.placeholder)
			this.setState({placeholder: true});
	}

	paste = (e) => {
		e.preventDefault();
    var text = (e.originalEvent || e).clipboardData.getData('text/plain');
    this.pasteText(text);
	}

	pasteText = (text) => {

		if(document.activeElement !== this.textInput.current){
			this.textInput.current.focus();
			let sel = document.getSelection();
			sel.selectAllChildren(this.textInput.current);
			sel.collapseToEnd();
		}

		text = text.replace(/\n/g, '<br/>')

		if(this.textInput.current.lastChild && this.textInput.current.lastChild.tagName === 'BR')
			this.textInput.current.lastChild.remove();
	   	
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

	timer = -1;
	_showEmojiPanel = (e) => {
		if(e.buttons !== 0)
			return;
		if(this.timer > 0){
			clearTimeout(this.timer);
			this.timer = -1;
			return;
		}
		this.setState({emojiPanel: true});
	}

	_hideEmojiPanel = () => {
		if(this.timer < 0)
			this.timer = setTimeout(() => {
				this.setState({emojiPanel: false});
				this.timer = -1;
			}, 200);
	}

	focus = () => {
		this.textInput.current.focus();
	}
	
	render(){
		const style = {
			lineHeight: this.lineHeight+'px', 
			padding: ((this.height-this.lineHeight)/2)+'px 4px', 
			outline: 'none'};

		return (
			<div 
				className={"chat " + this.props.className} 
				style={{display: this.props.show?'flex':'none'}}
			>
				<div 
					className="emoji-button" 
					onMouseOver={this._showEmojiPanel} 
					onMouseOut={this._hideEmojiPanel} 
				>
					<RippleButton className={'transparent chat-button' + (this.state.emojiPanel?' orange': '')} >
						<MdSentimentSatisfied size="1.9em"/>
					</RippleButton>
					<EmojiPanel paste={this.pasteText} show={this.state.emojiPanel}/>
				</div>

				<div className="input">
					{this.state.placeholder && <div className="placeholder" style={style}>
						Введите сообщение...
					</div>}
					<div 	ref={this.textInput} 
								contentEditable={true} 
								style={style} 
								onInput={this.checkPlaceholder} 
								onPaste={this.paste}
								spellCheck={false}
								onKeyDown={this.keyDown}></div>
				</div>

				<RippleButton 
					className={'transparent chat-button send'+(this.state.placeholder?' closed': '')} 
					onClick={this.send}
				>
					<MdSend size="1.9em" style={{transform: 'translateX(2px)'}}/>
				</RippleButton>

			</div>
		);
	}
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