import React from 'react'
import { InputText } from './../inputs/LoginInputs.jsx'
import { MdSearch } from 'react-icons/md'
import { Icon, BindIcon } from './../utils.jsx';
import Chat from './../inputs/Chat.jsx'
import { Message } from './messages.jsx'
import { Link } from 'react-router-dom'
import { url } from './../../constants.jsx'
import easeInOut from 'eases/quad-in-out'
import { getDate } from './../../tools/rus.js'

function getScroll(m){
	return m.scrollHeight - m.scrollTop - m.clientHeight;
}

class MessagesPage extends React.Component {

	constructor(props){
		super(props);

		this.binds = [];
		this.bind = null;
		this.lastScroll = -1;
		this.messagesRef = React.createRef();
		this.chatRef = React.createRef();
		this.state = {binds: [], bind: null}
	}

	onSearch = str => {

	}

	componentDidUpdate(prevProps, prevState){
		if(prevProps.match !== this.props.match){
			if(this.props.match.params.bind){
				if(this.props.match.params.bind !== this.bind){
					this.getBind(this.props.match.params.bind);
				}
			}else{
				this.setState({profile: null, messages: null});
				this.bind = null;
			}
		}

		
		if(prevState.bind !== this.state.bind){
			const el = this.messagesRef.current;
			el.scrollTop = el.scrollHeight;
			setTimeout(() => this.loadingBind = false, 0);
			this.chatRef.current.focus();
		}


		if(this.lastScroll >= 0){
			if(this.lastScroll < 20){
				this.scrollFlag = -1;
				requestAnimationFrame(this.scrollDown);
			}

			this.lastScroll = -1;
		}
	}

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
		const bind = this.state.bind;
		if(	bind && 
				this.messagesRef.current.scrollTop < 500 &&
				bind.messages[0].index > 0 && !this.fetchingFlag && !this.loadingBind){
				this.fetchingFlag = true;
				setTimeout(() => this.fetchingFlag = false, 1000);
				fetch(url+'/get-bind/'+bind.link+'?limit=100&last='+bind.messages[0].index, {
					method: 'GET',
					headers: { token: this.props.net.token }
				}).then(resp => resp.json())
				.then(jresp => {
					if(jresp.error){
						console.log(jresp.error);
						return;
					}
					bind.messages = jresp.messages.concat(bind.messages);
					this.setState({bind});
				});
			}
	}

	componentDidMount(){

		fetch(url+'/get-binds', {
			method: 'GET',
			headers: { token: this.props.net.token },
		}).then(resp => resp.json())
		.then(jresp => {
			if(jresp.error){
	  		console.error(jresp.error);
	  		return;
	  	}
	  	this.setState({ binds: jresp.binds });

			if(this.props.match.params.bind)
				this.getBind(this.props.match.params.bind);

		});

		this.props.net.emitter.on('message', this.addMessage);
	}

	componentWillUnmount(){
		this.props.net.emitter.off('message', this.addMessage);
	}

	getNewBind = str => {
		fetch(url+'/get-bind/'+str+'?limit=1', {
			method: 'GET',
			headers: {
				token: this.props.net.token
	  	}
		}).then(resp => resp.json())
		.then(jresp => {
			if(!jresp.error)
				this.setState({binds: [jresp, ...this.state.binds]});
		});
	}

	getBind = str => {
		this.bind = str;
		let bind = null;
		let bindIndex = -1;
		for(let i = 0; i < this.state.binds.length; i++){
			bind = this.state.binds[i];
			if(bind.link === str){
				bindIndex = i;
				this.setState({bind});
				break;
			}
		}
		this.loadingBind = true;
		if(bindIndex < 0){
			fetch(url+'/get-bind/'+str+'?limit=50', {
				method: 'GET',
				headers: {
					token: this.props.net.token
		  	}
			}).then(resp => resp.json())
			.then(jresp => {
				if(!jresp.error)
					this.setState({binds: [...this.state.binds, jresp], bind: jresp});
			});
		}else{
			//Если у первого сообщения индекс не нулевой, значит нужно обновить ленту сообщений
			//Он при обновлении прочитает сообщения автоматически)
			if(bind.messages[0].index > 0 && bind.messages.length < 50){
				fetch(url+'/get-bind/'+str+'?limit=50&last='+bind.messages[0].index, {
					method: 'GET',
					headers: {
						token: this.props.net.token
					}
				}).then(resp => resp.json())
				.then(jresp => {
					if(!jresp.error){

						jresp.messages.push(...bind.messages);

						const list = [...this.state.binds];
						list[bindIndex] = jresp;
						this.setState({binds: list, bind: jresp});
					}
				});
			}else{
				//А иначе 0 прочитать последние сообщения с места
				if(bind.messages[bind.messages.length-1].user.login !== this.props.net.profile.login){
					bind.readed = bind.messages[bind.messages.length-1].index+1
					this.forceUpdate(() => {
						this.props.net.socket.send(JSON.stringify({
							type: 'readed',
							token: this.props.net.token,
							readed: bind.messages[bind.messages.length-1].index+1,
							bind: bind.link
						}));
					});
				}
			}
		}
	}

	sendMessage = (text) => {
		if(this.state.bind === null)
			return;
		if(text.trim() === '')
			return;

		const len = this.state.bind.messages.length;

		this.addMessage({
			bind: this.bind, 
			user: this.props.net.profile, 
			text, 
			index: (len>0)?this.state.bind.messages[len-1].index+1:0,
			timestamp:Date.now()});

		fetch(url+'/write-message', {
				method: 'POST',
				headers: {
					token: this.props.net.token,
					'Content-Type': 'application/json;charset=utf-8',
		  	},
		  	body: JSON.stringify({bind: this.bind, text})
		}).then(resp => resp.json())
		.then(jresp => {
			console.log('Sended message');
		});
	}

	addMessage = message => {

		const list = [...this.state.binds];
		let bind = null;

		for(let i = 0; i < list.length; i++)
			if(message.bind === list[i].link){
				bind = list[i];
				list.splice(i, 1);
			}

		if(bind !== null){
			bind.messageCount++;
			if(this.state.bind === bind){

				this.lastScroll = getScroll(this.messagesRef.current);

				//Здесь мы отправим сообщение, что сообщения прочитаны
				bind.readed++;
				if(message.user.login !== this.props.net.profile.login)
					this.props.net.socket.send(JSON.stringify({
						type: 'readed',
						token: this.props.net.token,
						readed: bind.messageCount,
						bind: bind.link
					}));
			}else 
				bind = Object.assign({}, bind);

			bind.messages.push(message);
			list.unshift(bind);

			this.setState({binds: list});
		}else{
			console.log("GET NEW BIND - ", message.bind);
			this.getNewBind(message.bind);
		}
	}

	getStatusBind = () => {
		if(this.state.bind.isGroup){
			return 'Группа';
		}else{
			if(this.state.bind.online)
				return <b>В сети</b>;
			else
				return "Не в сети";
		}
	}

	render() {
		return (
			<div className="anim up message-page root-block">
				<header className="main-header">
					<h1>Сообщения</h1>
				</header>
				<main className="main-content">
					<div className="column" style={{flexBasis: '400px', maxWidth: '400px', flexShrink: 0}}>
						<div className="search-div">
							<InputText fields={{search: "Поиск"}} onChange={this.onSearch}>
								<MdSearch size="1.5em"/>
							</InputText>
						</div>
						<div>
						{this.state.binds && (
							<ul className="binds">
								{this.state.binds.map(bind => (
										<Bind  
											key={bind.link} 
											bind={bind}
											suser={this.props.net.profile.login}
									 		active={bind === this.state.bind}
									 	/>
								))}
							</ul>
						)}
						</div>
					</div>
					<div className="column" style={{flexGrow: 1, backgroundColor: '#E0E0E0'}}>
						
							<div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
								{this.state.bind && (
								<div className="profile-div">
									<Icon 
										src={this.state.bind.icon} 
										name={this.state.bind.name} 
										className={this.state.bind.isGroup?'group':'user'}
										size="50"
									/>
									<div className="profile-info">
										<div className="name">{this.state.bind.name}</div>
										<div className="status">
										{this.getStatusBind()}
										</div>
									</div>
								</div> 
								)}

								{this.state.bind && (
								<div className="messages" style={{flexGrow: 2}} ref={this.messagesRef} 
											onScroll={this.onScrollMessage}>
									<div className="messages-wrapper">
										<div>
										{this.state.bind.messages.map((el, index) => <Message 
											key={el.user.login+el.index} 
											className={(el.user.login === this.props.net.profile.login) && "mine"}
											message={el}
											lastMessage={(index > 0)?this.state.bind.messages[index-1]:null}
											/>)
										}
										</div>
									</div>
								</div>
								)}

								<Chat 
									className="chat-div" 
									send={this.sendMessage} 
									show={(this.state.bind !== null)}
									ref={this.chatRef}
								/>
							</div>
					</div>
				</main>
			</div>
		);
	}

}

export default MessagesPage;

function Bind (props) {
	let message = null;
	let timeString = '';
	let author = '';
	let unread = 0;
	const className = props.bind.isGroup?'group':'user';
	if(props.bind.messages.length>0){
		message = props.bind.messages[props.bind.messages.length-1];

		timeString = getDate(message.timestamp);

		if(message.user.login !== props.bind.link)
				if(message.user.login === props.suser)
					author = "Вы: ";
				else
					author = message.user.name + ": ";

		unread = props.bind.messageCount-props.bind.readed
	}
	return <Link to={props.bind.link} className="clear">
		<li className={'bind'+(props.active?' active':'')+(unread>0?' unreaded':'')}>
			<BindIcon src={props.bind.icon} name={props.bind.name} size="50" className={className}
				online={props.bind.online}/>
			<div className="bind-inner">
				<div className="content">
					<div className="profile-name">{props.bind.name}</div>
					{message && <div className="message-text">
						<span className='author'>{author}</span>
						{message.text}
					</div>}
				</div>

				<div>
					<div className="time">{timeString}</div>
					{(unread>0) && <div className="unread">{unread}</div>}
				</div>
				
			</div>
		</li>
	</Link>
}