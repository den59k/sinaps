import React from 'react'
import { InputText } from './../inputs/LoginInputs.jsx'
import { MdSearch } from 'react-icons/md'
import { Icon } from './../utils.jsx';
import Chat from './../inputs/Chat.jsx'
import { nanoid } from 'nanoid'
import { Message } from './messages.jsx'
import { Link } from 'react-router-dom'

class MessagesPage extends React.Component {

	constructor(props){
		super(props);

		this.bind = null;
		this.state = {profile: null, messages: null, binds: []}
	}

	onSearch = str => {

	}

	componentDidUpdate(prevProps){
		if(prevProps.match !== this.props.match){
			if(this.props.match.params.bind){
				if(this.props.match.params.bind !== this.bind)
					this.getBind(this.props.match.params.bind);
			}else{
				this.setState({profile: null, messages: null});
				this.bind = null;
			}
		}
	}

	componentDidMount(){

		fetch(this.props.net.url+'/get-binds', {
			method: 'GET',
			headers: { token: this.props.net.token },
		}).then(resp => resp.json())
		.then(jresp => {
			if(jresp.error){
	  		console.error(jresp.error);
	  		return;
	  	}
	  	for(let b of jresp.binds){
	  		if(b.isGroup){
	  			if(b.group.icon)
	  				b.group.icon = this.props.net.dbUrl + b.group.icon;
	  		}else{
	  			if(b.user.icon)
	  				b.user.icon = this.props.net.dbUrl + b.user.icon;
	  		}
	  	}
	  	this.setState({ binds: jresp.binds });
		});

		if(this.props.match.params.bind)
			this.getBind(this.props.match.params.bind);

	}

	getBind = bind => {
		this.bind = bind;
		fetch(this.props.net.url+'/get-bind/'+bind, {
			method: 'GET',
			headers: { token: this.props.net.token }
		}).then(resp => resp.json())
		.then(jresp => {
			if(jresp.error){
				console.error(jresp.error);
				return;
			}
			let profile = jresp.user;
			if(profile.icon) profile.icon = this.props.net.dbUrl+profile.icon;
			for(let el of jresp.messages){
				if(el.user.icon) el.user.icon = this.props.net.dbUrl+el.user.icon;
				el.key = nanoid(8);
			}
			this.setState({ profile, messages: jresp.messages });
		});
	}

	sendMessage = (text) => {
		if(this.bind === null)
			return;

		fetch(this.props.net.url+'/write-message', {
				method: 'POST',
				headers: {
					token: this.props.net.token,
					'Content-Type': 'application/json;charset=utf-8',
		  	},
		  	body: JSON.stringify({bind: this.bind, text})
		}).then(resp => resp.json())
		.then(jresp => {
			console.log(jresp);
		});
	}

	render() {
		return (
			<div className="anim up message-page root-block">
				<header className="main-header">
					<h1>Сообщения</h1>
				</header>
				<main className="main-content">
					<div className="column" style={{flexBasis: '350px'}}>
						<div className="search-div">
							<InputText fields={{search: "Поиск"}} onChange={this.onSearch}>
								<MdSearch size="1.5em"/>
							</InputText>
						</div>
						{this.state.binds?(
							<ul className="binds">
								{this.state.binds.map(bind => {
									if(bind.isGroup)
										return <Bind  key={bind.group.link} link={bind.group.link} 
										profile={bind.group} message={bind.messages[0]}
										author={bind.messages[0].user.login === this.props.net.profile.login?'Вы':
											bind.messages[0].user.name}/>
									else 
										return <Bind  key={bind.user.login} link={bind.user.login} 
										profile={bind.user} message={bind.messages[0]} 
										author={bind.messages[0].user.login === this.props.net.profile.login?'Вы':null}/>
								})}
							</ul>
						):<div></div>}
					</div>
					<div className="column" style={{flexGrow: 1, backgroundColor: '#E5E5E5'}}>
						{this.state.profile && (
							<div style={{display: 'flex', flexDirection: 'column', height: '100%'}}>
								<div className="profile-div">
									<Icon profile={this.state.profile} size="50"/>
									<div className="profile-info">
										<div className="name">{this.state.profile.name + ' ' + this.state.profile.surname}</div>
										<div className="status">Не в сети</div>
									</div>
								</div>

								<div className="messages" style={{flexGrow: 2}} >
									{this.state.messages.map((el, index) => <Message key={el.key} 
										text={el.text} time={el.timestamp} profile={el.user} 
										lastMessage={(index > 0)?this.state.messages[index-1]:null}/>)}
								</div>

								<Chat className="chat-div" send={this.sendMessage}/>
							</div>
						)}
					</div>
				</main>
			</div>
		);
	}

}

export default MessagesPage;

function Bind (props) {

	const time = new Date(props.message.timestamp);
	const min = time.getMinutes();
	const timeString = time.getHours() + ':'+(min<10?'0'+min:min);
	
	return <Link to={props.link} className="clear">
		<li className="bind">
			<Icon profile={props.profile} size="50"/>
			<div style={{flexGrow: '1'}}>
				<div className="message-header" style={{marginBottom: '8px'}}>
					<span className="profile-name" style={{color: '#333333'}}>
						{props.profile.name + ' ' + props.profile.surname}
					</span>
					<span className="time">
						{timeString}
					</span>
				</div>

				<div className="message-text">
					{props.author && <span className='author'>{props.author+': '}</span>}{props.message.text}
				</div>
			</div>
		</li>
	</Link>
}