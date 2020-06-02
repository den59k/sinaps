import React from 'react'
import { Icon } from './../utils.jsx';
import cn from 'classnames'
import {getDate} from './../../tools/rus.js'
import easeInOut from 'eases/quad-in-out'

export function Message(props){

	const text = props.message.text;
	const time = new Date(props.message.timestamp);
	const min = time.getMinutes();
	const timeString = time.getHours() + ':'+(min<10?'0'+min:min);

	let nextFlag = props.lastMessage && props.lastMessage.user.login === props.message.user.login && 
		props.message.timestamp < props.lastMessage.timestamp+600000;

	const offset = time.getTimezoneOffset()*60*1000;
	let lastDay = -1;
	if(props.lastMessage)
		lastDay = (props.lastMessage.timestamp-offset)/(24*60*60*1000) >> 0;	//24x60x60x1000

	const day = (props.message.timestamp-offset)/(24*60*60*1000) >> 0;
	let dateString = null;

	if(day !== lastDay){
		nextFlag = false;
		dateString = getDate(props.message.timestamp, true);

	}

	if(nextFlag){
		return (
			<div className="message-wrapper next">
				<div className="message">
					<div className="message-text">
						{text}
					</div>
				</div>
			</div>
		)
	}else return (
		<div className={cn("message-wrapper new", props.className)}>
			{(dateString !== null) && <div className="message-date">{dateString}</div>}
			<Icon profile={props.message.user} size="45"/>
			<div className="message">
				<div className="message-header">
					<span className="profile-name">
						{props.message.user.name + ' ' + props.message.user.surname}
					</span>
					<span className="time">
						{timeString}
					</span>
				</div>
				<div className="message-text">
					{text}
				</div>
			</div>
		</div>
		)
}

export class MessageBlock extends React.Component{
	constructor(props){
		super(props);
		this.messagesRef = React.createRef();
		this.lastScroll = -1;
		this.updateFlag = false;
		this.loadingFlag = false;
		this.timeout = null;
	}

	componentDidMount(){
		const el = this.messagesRef.current;
		this.loadingFlag = true;
		setTimeout(() => this.loadingFlag = false, 0);
		el.scrollTop = el.scrollHeight;
	}

	componentDidUpdate(prevProps){
		if(prevProps.bind !== this.props.bind || this.updateFlag){
			const el = this.messagesRef.current;
			this.loadingFlag = true;
			setTimeout(() => this.loadingFlag = false, 50);
			el.scrollTop = el.scrollHeight;
			this.updateFlag = false;
		}

		if(this.lastScroll >= 0){
			if(this.lastScroll < 20){
				this.scrollFlag = -1;
				requestAnimationFrame(this.scrollDown);
			}

			this.lastScroll = -1;
		}
	}

	updateMessages = () => {
		this.updateFlag = true;
	}

	//Это просто анимация появления сообщения
	scrollFlag = -1;
	scrollDown = () => {
		this.scrollFlag = this.messagesRef.current.scrollTop;
		const startTime = performance.now();
		const startScroll = this.messagesRef.current.scrollTop;
		const endScroll = this.messagesRef.current.scrollHeight-this.messagesRef.current.clientHeight;

		const anim = time => {
			if(this.scrollFlag !== this.messagesRef.current.scrollTop)
				return;
			let timeFraction = Math.min((time - startTime) / 140, 1);

			timeFraction = easeInOut(timeFraction);

			this.messagesRef.current.scrollTop = (startScroll+(endScroll-startScroll)*timeFraction)>>0;
			this.scrollFlag = this.messagesRef.current.scrollTop;
			if(timeFraction < 1)
				requestAnimationFrame(anim);
		};

		anim(startTime);

	}

	fetchingFlag = false
	onScrollMessage = (e) => {
		if(this.props.bind && 
				this.messagesRef.current.scrollTop < 500 &&
				this.props.messages[0].index > 0 && !this.fetchingFlag && !this.loadingFlag){
				this.fetchingFlag = true;
				setTimeout(() => this.fetchingFlag = false, 1000);
				this.props.scrollMessage();
			}
	}


	updateScroll(){
		const m = this.messagesRef.current;
		this.lastScroll = m.scrollHeight - m.scrollTop - m.clientHeight;
	}

	render(){
		return (
			<div className="messages" style={{flexGrow: 2}} ref={this.messagesRef} 
					onScroll={this.onScrollMessage}>
			<div className="messages-wrapper">
				<div>
				{this.props.messages.map((el, index) => <Message 
					key={el.user.login+el.index} 
					className={(el.user.login === this.props.net.profile.login) && "mine"}
					message={el}
					lastMessage={(index > 0)?this.props.messages[index-1]:null}
					/>)
				}
				</div>
			</div>
		</div>
		);
	}
}