import React, { useEffect, useState } from 'react'
import { dbUrl } from './../constants.jsx'
import cn from 'classnames'

import { FaVolumeMute } from 'react-icons/fa'
import { ReactComponent as MicroSVG } from './img/micro-icon.svg'
import { ReactComponent as WebcamSVG } from './img/webcam-icon.svg'

export function Icon(props) {
	const size = props.size || 40;

	let src = props.src?(dbUrl+props.src):null;
	let name = props.name;

	if(props.profile){
		name = props.profile.name + ' '+props.profile.surname;
		src = props.profile.icon?(dbUrl+props.profile.icon):null;
	}

	if(src){
		return <img className={cn("icon")} src={src} alt={name} title={name}
						style={{width: size+'px', height: size+'px', ...props.style}}/>
	}else{
		const text = name[0];
		return <div style={{
			width: size+'px', 
			height: size+'px',		
			lineHeight: (size-2)+'px', 
			fontSize: (size/2)+'px',
			...props.style
		}} className={cn("icon-empty icon", props.className)} title={name}>{text}</div>
	}
}

export function BindIcon(props){
	const size = props.size || 40;
	return <div className="icon-wrapper" style={{height: size+'px'}}>
		<Icon {...props}/>
		{(props.online===true) && <div className="mini-icon"></div>}
	</div>
}

export function MicroIcon(props){

	useEffect(() => {
		if(props.stream.stream){
			const context = props.context;

			const source = context.createMediaStreamSource(props.stream.stream);
			const analyser = context.createAnalyser();

			analyser.fftSize = 64;
			source.connect(analyser);

			const gain = context.createGain();

			analyser.connect(gain);
			gain.connect(context.destination);

			setGainNode(gain);

			const dataArray = new Uint8Array(analyser.fftSize);

			const interval = setInterval(() => {
				analyser.getByteTimeDomainData(dataArray);
				let sum = 0;
				for(let i = 4; i < analyser.fftSize-4; i++)
					sum += Math.abs(dataArray[i]-128);
				
				let _level = sum/(analyser.fftSize-8);
				_level = Math.min(_level/8|0, 4)
				if(_level !== level)
					setLevel(_level);

			}, 300);

			return (() => clearInterval(interval));
		}
	}, [props.stream]);

	const [muted, setMuted] = useState(false);
	const [gainNode, setGainNode] = useState(null);
	const [level, setLevel] = useState(0);

	const mute = () => {
		if(muted === true){
			setMuted(false);
			gainNode.gain.value = 1;
		}else{
			setMuted(true);
			gainNode.gain.value = 0;
		}
	}

	const _props = {...props, profile: props.stream.user};
	delete _props.stream;
	delete _props.context;

	_props.style = {border: `${level}px solid #FF5C00`, margin: (4-level)+'px'};

	return(
	<div {..._props} 
		style={{display: 'inline-block'}} 
		className="icon-wrapper"
		onClick={mute}>
		<Icon size="60" {..._props}/>
		{ props.stream.video && <WebcamSVG 
			className="sub-icon" 
			style={{left: '-7px'}} 
			title="Использует веб-камеру"/>}
		{ props.stream.audio && <MicroSVG 
			className="sub-icon" 
			style={{right: '-7px'}} 
			title="Использует микрофон"/>}
		{ muted && <div className='volume-stats'><FaVolumeMute/></div>}
	</div>
	);
}

export function Title(props){
	return <div className="title" style={props.pos?props.pos: {display:'none'} }>{props.text}</div>
}