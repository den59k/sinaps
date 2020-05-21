import React from 'react'
import { Icon } from './../utils.jsx';

export function Message(props){

	const text = props.text;
	const time = new Date(props.time);
	const min = time.getMinutes();
	const timeString = time.getHours() + ':'+(min<10?'0'+min:min);
	if(props.lastMessage && props.lastMessage.user.login === props.profile.login && 
		props.time < props.lastMessage.timestamp+600000){
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
		<div className="message-wrapper new">
			<Icon profile={props.profile} size="45"/>
			<div className="message">
				<div className="message-header">
					<span className="profile-name">
						{props.profile.name + ' ' + props.profile.surname}
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