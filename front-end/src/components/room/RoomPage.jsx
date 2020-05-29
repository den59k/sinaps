import React from 'react'
import { url } from './../../constants'
import { IoIosArrowBack } from 'react-icons/io'

import { AlertWrapper } from './../inputs/Alert.jsx'
import { RippleA, RippleButton } from './../inputs/LoginInputs.jsx'
import { numeral } from './../../tools/rus'

export default class RoomPage extends React.Component {
	constructor(props){
		super(props);
		this.alertRef = React.createRef();
		this.link = props.match.params.bind;
		this.state = {room: null};

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
			this.setState({room: jresp});
		});
	}

	componentWillUnmount(){
		console.log('leave');
		this.props.net.socket.send(JSON.stringify({
			type: 'leave-room',
			token: this.props.net.token,
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
								<RippleButton className="transparent" to="#showusers">
									{room.userCount + ' ' + numeral(room.userCount, 'участник', 'участника', 'участников')}
								</RippleButton>
							</div>}
						</header>
					</div>
					<div className="chat-column">
						
					</div>
				</div>
			</AlertWrapper>
		);
	}
}