import React from 'react'
import { url } from './../../constants'
import { IoIosArrowBack } from 'react-icons/io'
import { FaMicrophone } from 'react-icons/fa'
import { ReactComponent as WebCamIcon } from './webcam.svg'
import { MessageBlock } from './../main/messages.jsx'
import { AlertWrapper } from './../inputs/Alert.jsx'
import { RippleA, RippleButton } from './../inputs/LoginInputs.jsx'
import { numeral } from './../../tools/rus'
import { Icon, MicroIcon } from './../utils.jsx'
import VideoBlock from './video-block.jsx'

import Chat from './../inputs/Chat.jsx'

import webrtcSystem from './webrtc-connection'

export default class RoomPage extends React.Component {
	constructor(props){
		super(props);
		this.alertRef = React.createRef();
		this.link = props.match.params.bind;
		this.state = { 
			room: null, 
			messages: null, 
			streams: [], 
			context: null,
			constraints: { video: false, audio: false } ,
			highlighted: null,
		};
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
			//console.log(jresp);
			const context = new (window.AudioContext || window.webkitAudioContext)();
			this.webrtc = new webrtcSystem(jresp.default);
			this.webrtc.context = context;
			for(let sender of jresp.senders)
				this.addSender(sender);
			this.setState({messages: jresp.messages, room: jresp.room, context});
			this.props.net.emitter.on('message', this.addMessage);
			this.props.net.emitter.on('add-sender', this.addSender);
			this.props.net.emitter.on('close-sender', this.closeSender);
			this.props.net.emitter.on('update-user-count', this.updateUserCount);
			this.props.net.emitter.on('room-error', this.onError);
		});
	}

	componentWillUnmount(){
		
		this.props.net.emitter.off('message', this.addMessage);
		this.props.net.emitter.off('add-sender', this.addSender);
		this.props.net.emitter.off('close-sender', this.closeSender);
		this.props.net.emitter.off('update-user-count', this.updateUserCount);
		this.props.net.emitter.on('room-error', this.onError);
		this.webrtc.close();
		this.props.net.socket.send(JSON.stringify({
			type: 'leave-room',
			token: this.props.net.token,
		}));
	}

	addSender = async (sender) => {
		const answer = await this.webrtc.addReciever(sender, (
			stream => this.addStream(stream, {user: sender.user, ...sender.constraints})
		));

		this.props.net.socket.send(JSON.stringify({
			type: 'create-receive',
			token: this.props.net.token,
			answer,
			sender: sender.user.login
		}));
	}

	closeSender = ({login}) => {
		console.log("CLOSE SENDER - ", login);
		this.setState({streams: this.state.streams.filter(
			({user}) => user.login !== login
		)});
		this.webrtc.remove(login);
	}

	updateUserCount = ({userCount}) => {
		const room = Object.assign({}, this.state.room, {userCount});
		this.setState({room});
	}

	onError = ({error}) => {
		switch (error){
			case 'ExistLogin': this.alertRef.current.alert(
				'Ваш профиль уже используется в этой комнате для видеосвязи'
				); break;
			default: console.error(error); break;
		}
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

	addStream = (stream, {user, video, audio}) => {
		const _stream = {user, video, audio, stream}
		this.setState({streams: [...this.state.streams, _stream]});
	}


	activateCamera = async () => {
		try{
			for(let stream of this.state.streams){
				if(stream.user.login === this.props.net.profile.login)
					throw(new Error('ExistLogin'));
			}
			const answer = await this.webrtc.connect(
				(stream) => this.addStream(stream, {
					user: this.props.net.profile, 
					video: true, 
					audio: true
				}), 
				{ video: true, audio: true }
			);

			this.props.net.socket.send(JSON.stringify({
				type: 'create-connection',
				token: this.props.net.token,
				answer
			}));

			this.setState({constraints: { video: true, audio: true } });

		}catch(e){
			if(e.name === "NotAllowedError")
				this.alertRef.current.alert(
					"Сначала включите разрешение на использование веб-камеры в браузере"
				);
			if(e.message === "ExistLogin")
				this.onError({error: e.message});
			console.log(e.message);
		}
	}

	activateMicrophone = async () => {
		const constraints = this.state.constraints;
		constraints.audio = true;
		try{
			for(let stream of this.state.streams){
				if(stream.user.login === this.props.net.profile.login)
					throw(new Error('ExistLogin'));
			}

			const answer = await this.webrtc.connect(
				(stream) => this.addStream(stream, {user: this.props.net.profile, ...constraints}),
				constraints
			);

			this.props.net.socket.send(JSON.stringify({
				type: 'create-connection',
				token: this.props.net.token,
				answer
			}));

			this.setState({ constraints });

		}catch(e){
			if(e.name === "NotAllowedError")
				this.alertRef.current.alert("Сначала включите разрешение на использование микрофона в браузере");
			if(e.message === "ExistLogin")
				this.onError({error: e.message});
			console.log(e);
		}
	}

	highlightStream (login){
		this.setState({highlighted: login});
	}

	clearHighlightStream (login){
		if(this.state.highlighted === login)
			this.setState({highlighted: null});
	}

	render(){
		const room = this.state.room;
		return (
			<AlertWrapper delay={2000} ref={this.alertRef}>
				<div className="room-main-content">
					<div className="main-column">
						<header className="main-header">
							<RippleA 
								title="Вернуться к переписке"
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

						{(this.state.room !== null) && (
						<div className="micro-block" style={{textAlign: 'center'}}>
							{this.state.streams.map(_stream => (
								<MicroIcon 
									key={_stream.user.login} 
									stream={_stream}
									context={this.state.context}
									onMouseEnter={() => this.highlightStream(_stream.user.login)}
									onMouseLeave={() => this.clearHighlightStream(_stream.user.login)}
									/>
								))}

							<div  style={{float: 'right'}}>
								<RippleButton 
									title={this.state.constraints.audio?'Выключить микрофон':'Включить микрофон'}
									className={'transparent add-micro-button '+(this.state.constraints.audio?"active" : "add") }
									style={{margin: '4px'}}
									onClick={this.activateMicrophone}>
									<FaMicrophone size="1.9em"/>
								</RippleButton>

								<RippleButton 
									title={this.state.constraints.video?'Выключить веб-камеру':'Включить веб-камеру'}
									className={'transparent add-micro-button '+(this.state.constraints.video?"active" : "add") }
									style={{margin: '4px', marginRight: '0'}}
									onClick={this.activateCamera}>
									<WebCamIcon style={{height: '2.1em'}}/>
								</RippleButton>
							</div>
						</div>
						)}
					</div>
					{(this.state.room !== null) && <div className="telling-column">
						{this.state.streams.length > 0 && <div className="webcam-block">
							{this.state.streams.map(_stream => _stream.video === true?(
								<VideoBlock
									srcObject={_stream.stream} 
									key={_stream.user.login}
									onMouseEnter={() => this.highlightStream(_stream.user.login)}
									onMouseLeave={() => this.clearHighlightStream(_stream.user.login)}>
									<div className={'video-icon '+ (_stream.user.login === this.state.highlighted?'show':'')}>
										<Icon profile={_stream.user} size="50"/>
									</div>
								</VideoBlock>
							):null)}
						</div>}
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