import React from 'react'
import { InputText } from './../inputs/LoginInputs.jsx'
import { MdSearch } from 'react-icons/md'
import { Icon } from './../utils.jsx';
import Chat from './../inputs/Chat.jsx'

class MessagesPage extends React.Component {

	constructor(props){
		super(props);

		this.state = {profile: null}
	}

	onSearch = str => {

	}

	componentDidMount(){
		if(this.props.match.params.bind){
			const bind = this.props.match.params.bind;

			fetch(this.props.net.url+'/get-bind/'+bind, {
				method: 'GET',
				headers: {
					token: this.props.net.token
		  	}
		  }).then(resp => resp.json())
		  .then(jresp => {
		  	if(jresp.error){
		  		console.error(jresp.error);
		  		return;
		  	}
		  	let profile = jresp.user;
		  	if(profile.icon) profile.icon = this.props.net.dbUrl+profile.icon;

		  	this.setState({profile});
		  });
		}
	}

	render() {

		return (
			<div className="anim up message-page root-block">
				<header className="main-header">
					<h1>Сообщения</h1>
				</header>
				<main className="main-content">
					<div className="column" style={{flexBasis: '350px', padding: '0 10px'}}>
						<div className="search-div">
							<InputText fields={{search: "Поиск"}} onChange={this.onSearch}>
								<MdSearch size="1.5em"/>
							</InputText>
						</div>
					</div>
					<div className="column" style={{flexGrow: 1, backgroundColor: '#E7E7E7'}}>
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
									
								</div>

								<Chat className="chat-div"/>
							</div>
						)}
					</div>
				</main>
			</div>
		);
	}

}

export default MessagesPage;