import React from 'react'
import { url } from './../../constants'
import { IoIosArrowBack } from 'react-icons/io'
import { FaMicrophone, FaPlus } from 'react-icons/fa'
import { ReactComponent as WebCamIcon } from './webcam.svg'
import { MessageBlock } from './../main/messages.jsx'
import { AlertWrapper } from './../inputs/Alert.jsx'
import { RippleA, RippleButton } from './../inputs/LoginInputs.jsx'
import { numeral } from './../../tools/rus'

import VideoBlock from './video-block.jsx'

import Chat from './../inputs/Chat.jsx'

import webrtcSystem from './webrtc-connection'

export default class RoomPage extends React.Component {
	constructor(props){
		super(props);
		this.alertRef = React.createRef();
		this.link = props.match.params.bind;
		this.state = { room: null, messages: null, streams: [] };
		this.messagesRef = React.createRef();
		this.webrtc = null;
	}

	componentDidMount(){
		console.log(url+'/join-room/'+this.link);
		fetch(url+'/join-room/'+this.link, {
			method: 'POST',
			headers: {
				token: this.props.net.token,
				'Content-Type': 'application/json;charset=utf-8',
  		},
		}).then(resp => resp.json())
		.then(jresp => {
			if(jresp.error){
				console.error(jresp.error);
				return;
			}
			console.log(jresp);
			this.webrtc = new webrtcSystem(jresp.default);
			for(let sender of jresp.senders)
				this.addSender(sender);
			this.setState({messages: jresp.messages, room: jresp.room});
			this.props.net.emitter.on('message', this.addMessage);
			this.props.net.emitter.on('add-sender', this.addSender);
		});
	}

	componentWillUnmount(){
		
		this.props.net.emitter.off('message', this.addMessage);
		this.props.net.socket.send(JSON.stringify({
			type: 'leave-room',
			token: this.props.net.token,
		}));
	}

	addSender = async (sender) => {
		const answer = await this.webrtc.addReciever(sender, (
			stream => this.addStream(sender.user, stream)
		));

		this.props.net.socket.send(JSON.stringify({
			type: 'create-receive',
			token: this.props.net.token,
			answer,
			sender: sender.user.login
		}));
	}

	sendMessage = (text) => {

		if(text.trim() === '')
			return;

		const len = this.state.messages.length;

		this.addMessage({
			bind: this.state.room.link, 
			user: this.props.net.profile, 
			text, 
			index: (len>0)?this.state.messages[len-1].index+1:0,
			timestamp:Date.now()});

		fetch(url+'/write-message', {
				method: 'POST',
				headers: {
					token: this.props.net.token,
					'Content-Type': 'application/json;charset=utf-8',
				},
		  	body: JSON.stringify({bind: this.state.room.link, text})
		}).then(resp => resp.json())
		.then(jresp => {
			console.log('Sended message');
		});
	}

	addMessage = message => {
		if(message.bind === this.state.room.link){
			this.messagesRef.current.updateScroll();
			this.setState({messages: [...this.state.messages, message]});
		}
	}

	scrollMessage = (e) => {
		let messages = this.state.messages;
		fetch(url+'/get-bind/'+this.state.room.link+'?limit=100&last='+messages[0].index, {
			method: 'GET',
			headers: { token: this.props.net.token }
		}).then(resp => resp.json())
		.then(jresp => {
			if(jresp.error){
				console.log(jresp.error);
				return;
			}
			messages = jresp.messages.concat(messages);
			this.setState({messages});
		});
	}

	addStream = (user, stream) => {
		const _stream = {user, stream}
		this.setState({streams: [...this.state.streams, _stream]});
	}

	activateCamera = async () => {
		const answer = await this.webrtc.connect(
			(stream) => this.addStream(this.props.net.profile, stream)
		);
		this.props.net.socket.send(JSON.stringify({
			type: 'create-connection',
			token: this.props.net.token,
			answer
		}));
	}

	render(){
		const room = this.state.room;
		return (
			<AlertWrapper delay={2000} ref={this.alertRef}>
				<div className="room-main-content">
					<div className="main-column">
						<header className="main-header">
							<RippleA 
								className="transparent" 
								to={'/'+this.props.match.params.bind} 
								style={{fontWeight: 600}}>
								<IoIosArrowBack size="1.8em"/>Назад
							</RippleA>
							{(room !== null) && <div className="room-header-title">
								<h1>{room.name}</h1>
								<RippleButton className="transparent user-count">
									{room.userCount + ' ' + numeral(room.userCount, 'участник', 'участника', 'участников')}
								</RippleButton>

								<span className="room-time" >0:00</span>
							</div>}
						</header>

						<div className="micro-block">
							<RippleButton className="transparent add-micro-button add" style={{float: 'right'}}>
								<FaMicrophone size="1.9em"/>
							</RippleButton>
						</div>
					</div>
					{(this.state.room !== null) && <div className="telling-column">
						<div className="webcam-block">
							{this.state.streams.map(_stream => (
								<VideoBlock srcObject={_stream.stream} key={_stream.user.login}></VideoBlock>
							))}
							<RippleButton className="transparent add-micro-button add" onClick={this.activateCamera}>
								<WebCamIcon style={{height: '2.1em'}}/>
							</RippleButton>
						</div>
						<MessageBlock 
								net={this.props.net}
								messages={this.state.messages}
								bind={this.state.room.link}
								scrollMessage={this.scrollMessage}
								ref={this.messagesRef}
								/>
						<Chat 
							className="chat-div" 
							send={this.sendMessage} 
							show={(this.state.bind !== null)}
							ref={this.chatRef}
						/>
					</div>}
				</div>
			</AlertWrapper>
		);
	}
}