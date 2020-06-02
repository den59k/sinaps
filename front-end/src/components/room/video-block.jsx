import React, { useEffect, useRef } from 'react'

const VideoBlock = (props) => {

	const ref = useRef(null);
	useEffect(() => {
		ref.current.srcObject = props.srcObject;
		console.log(props.srcObject.getTracks());
	}, [props.srcObject])

	return (
		<video ref={ref} autoPlay={true} muted={true}></video>
	);
}

export default VideoBlock;