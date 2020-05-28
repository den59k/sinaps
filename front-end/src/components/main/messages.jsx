import React from 'react'
import { Icon } from './../utils.jsx';
import cn from 'classnames'
import {getDate} from './../../tools/rus.js'

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