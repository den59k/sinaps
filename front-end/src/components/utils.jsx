import React from 'react'
import { dbUrl } from './../constants.jsx'
import cn from 'classnames'
import { ReactComponent as MicroSVG } from './img/micro-icon.svg'
import { ReactComponent as WebcamSVG } from './img/webcam-icon.svg'

function Icon(props) {
	const size = props.size || 40;

	let src = props.src?(dbUrl+props.src):null;
	let name = props.name;

	if(props.profile){
		name = props.profile.name + ' '+props.profile.surname;
		src = props.profile.icon?(dbUrl+props.profile.icon):null;
	}

	if(src){
		return <img className={cn("icon")} src={src} alt={name} title={name}
						style={{width: size+'px', height: size+'px'}}/>
	}else{
		const text = name[0];
		return <div style={{
			width: size+'px', 
			height: size+'px',		
			lineHeight: (size-2)+'px', 
			fontSize: (size/2)+'px'
		}} className={cn("icon-empty icon", props.className)} title={name}>{text}</div>
	}
}

function BindIcon(props){
	const size = props.size || 40;
	return <div className="icon-wrapper" style={{height: size+'px'}}>
		<Icon {...props}/>
		{(props.online===true) && <div className="mini-icon"></div>}
	</div>
}

function MicroIcon(props){

	const _props = {...props};
	delete _props.video;
	delete _props.audio;


	return(
	<div {..._props} style={{display: 'inline-block'}} className="icon-wrapper">
		<Icon size="60" {..._props}/>
		{ props.video && <WebcamSVG 
			className="sub-icon" 
			style={{left: '-7px'}} 
			title="Использует веб-камеру"/>}
		{ props.audio && <MicroSVG 
			className="sub-icon" 
			style={{right: '-7px'}} 
			title="Использует микрофон"/>}
	</div>
	);
}

function Title(props){
	return <div className="title" style={props.pos?props.pos: {display:'none'} }>{props.text}</div>
}

export { Icon, Title, BindIcon, MicroIcon };