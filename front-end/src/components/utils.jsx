import React from 'react'
import { dbUrl } from './../constants.jsx'
import cn from 'classnames'

function Icon(props) {
	const size = props.size || 40;

	let src = props.src?(dbUrl+props.src):null;
	let name = props.name;

	if(props.profile){
		name = props.profile.name + ' '+props.profile.surname;
		src = props.profile.icon?(dbUrl+props.profile.icon):null;
	}

	if(src){
		return <img className={cn("icon")} src={src} alt={name}
						style={{width: size+'px', height: size+'px'}}/>
	}else{
		const text = name[0];
		return <div style={{
			width: size+'px', 
			height: size+'px',		
			lineHeight: (size-2)+'px', 
			fontSize: (size/2)+'px'
		}} className={cn("icon-empty icon", props.className)}>{text}</div>
	}
}

function BindIcon(props){

	return <div className="icon-wrapper">
		<Icon {...props}/>
		{(props.online===true) && <div className="mini-icon"></div>}
	</div>
}

function Title(props){
	return <div className="title" style={props.pos?props.pos: {display:'none'} }>{props.text}</div>
}

export { Icon, Title, BindIcon };