import React from 'react'
import {Link} from 'react-router-dom';
import { InputText, InputCheckbox, RippleButton } from './../inputs/LoginInputs.jsx'
import { MdMailOutline } from 'react-icons/md'
import { FaKey, FaVk, FaGoogle} from 'react-icons/fa'

class LoginPage extends React.Component {

	constructor(props){
		super(props);
		this.loadingFlag = false;
		this.url = props.net.url;

		this.auth = {login: '', password: ''};
	}

	login = (e) => {
		e.preventDefault();
		if(this.loadingFlag)
			return;
		this.loadingFlag = true;

		fetch(this.url+'/authorization', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json;charset=utf-8'
	  	},
			body: JSON.stringify(this.auth) })
		.then(response => response.json())
		.then(res => {
			console.log(res);
			this.loadingFlag = false;
		});
	}

	componentWillUnmount(){
		this.props.unmount(this.render());
	}

	render() {

		return (
			<div className="login-page anim">
				<div className="login-column">
					<form className="login-form" onSubmit={this.login}>
						<h1>Вход в систему</h1>
						<InputText placeholder="E-mail" type="text" onChange={(str) => this.auth.login = str}>
							<MdMailOutline size="1.6em"/>
						</InputText>
						<InputText placeholder="Пароль" type="password" onChange={(str) => this.auth.password = str}>
							<FaKey size="1.3em"/>
						</InputText>
						<div className="form-flex">
							<InputCheckbox onChange={(str) => this.remember = str}>Запомнить меня</InputCheckbox>
							<RippleButton>ВОЙТИ</RippleButton>
						</div>
					</form>

					<p style={{marginTop: '22px', marginBottom: '13px'}}>Еще не получили доступ к видеолекциям?</p>
					<Link to="/auth/register" className="center-button">Создать аккаунт</Link>

					<hr style={{marginTop: '40px'}}/>
					<span className="podpis" style={{position: 'relative', top: '-19px'}}>или</span>

					<RippleButton className="social-media-button" style={{backgroundColor: '#4A76A8', marginBottom: '12px'}} size={200}>
						<FaVk/>
						Войти через ВК
					</RippleButton>
					<RippleButton className="social-media-button" style={{backgroundColor: '#F44235'}} size={200}>
						<FaGoogle/>
						Войти через Google
					</RippleButton>

				</div>

				<div className="login-label" style={{marginBottom: '200px'}}>
					<p>Дистанционное обучение - <span className="orange">это просто</span></p>
				</div>
			</div>
		);
	}

}

export default LoginPage;