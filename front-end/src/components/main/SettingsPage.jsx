import React from 'react'
import {RippleButton} from './../inputs/LoginInputs.jsx'

export default function SettingsPage (props){

	const exit = () => {
		props.net.emitter.emit('logout');
	}

	return (
	<div>
		<header className="main-header">
			<h1>Настройки</h1>
		</header>
		<RippleButton onClick={exit}>
			Выйти из профиля
		</RippleButton>
	</div>
	);
}