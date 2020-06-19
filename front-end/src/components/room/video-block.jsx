import React, { useEffect, useRef } from 'react'

const VideoBlock = (props) => {

	const ref = useRef(null);
	useEffect(() => {
		if(props.srcObject)
			ref.current.srcObject = props.srcObject;
	}, [props.srcObject]);

	const _props = {...props};
	delete _props.srcObject;

	return (
		<div className="video-wrapper" {..._props}>
			<video ref={ref} autoPlay={true} muted={true}>
			</video>
			{props.children}
		</div>
	);
}

export default VideoBlock;