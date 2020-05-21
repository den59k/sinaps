import React from 'react'

function Icon(props) {
	const size = props.size || 40;
	if(props.profile.icon){
		return <img {...props} className="icon" src={props.profile.icon} alt={props.profile.name + ' '+props.profile.surname}
						style={{width: size+'px', height: size+'px'}}/>
	}else{
		const text = props.profile.name[0];
		return <div {...props} style={{backgroundColor: '#4F0087', width: size+'px', height: size+'px',
							lineHeight: (size-4)+'px', fontSize: (size/2)+'px'}} 
								className={"icon-empty icon "+props.className}>{text}</div>
	}
}

function Title(props){
	return <div className="title" style={props.pos?props.pos: {display:'none'} }>{props.text}</div>
}

export { Icon, Title };