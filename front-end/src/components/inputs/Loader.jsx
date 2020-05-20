import React from 'react'

export default function Loader (props){ 
	const size = props.size || 50;
	return <svg width={size} height={size} viewport="0 0 50 50" viewBox="0 0 50 50" className="loader"
	stroke="currentColor">
	<circle cx="25" cy="25" r="15" strokeWidth="3" fill="none"/>
</svg>;
}