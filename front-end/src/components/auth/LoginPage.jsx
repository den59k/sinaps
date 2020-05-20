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
		this.state = {errors: {login: null, password: null}}
	}

	login = (e) => {
		e.preventDefault();
		if(this.loadingFlag)
			return;

		const errors = {login: null, password: null};
		if(this.auth.login === '')
			errors.login = 'Поле "E-mail" должно быть заполнено';

		const reg = /^([A-Za-z0-9_\-.])+@([A-Za-z0-9_\-.])+.([A-Za-z]{2,4})$/;
		if(reg.test(this.auth.login) === false)
			errors.login = 'Нет такого email, и быть не может';

		if(this.auth.password === '')
			errors.password = 'Поле "Пароль" должно быть заполнено';

		this.setState({errors});

		for(let key in errors)
			if(errors[key] !== null)
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
			this.loadingFlag = false;
			if(res.errors){
				Object.assign(errors, res.errors);
				this.setState({errors});
				return;
			}

			if(res.success){
				this.props.onLogin(res.success);
			}
		})
		.catch(e => { this.loadingFlag = false });
	}


	onChange = str => {
		Object.assign(this.auth, str);
		const errors = Object.assign({}, this.state.errors);

		for(let key in str)
			switch(key){
				case 'login': errors.login = null; break;
				case 'password': errors.password = null; break;
				default: 
			}
		this.setState({errors});
	}

	render() {

		return (
			<div className="login-page anim up">
				<div className="login-column">
					<form className="login-form" onSubmit={this.login}>
						<h1>Вход в систему</h1>
						<InputText fields={{login: "E-mail"}} type="text" onChange={this.onChange} 
							error={this.state.errors.login}>
							<MdMailOutline size="1.6em"/>
						</InputText>
						<InputText fields={{password: "Пароль"}} type="password" onChange={this.onChange}
							error={this.state.errors.password}>
							<FaKey size="1.3em"/>
						</InputText>
						<div className="form-flex">
							<InputCheckbox onChange={(str) => this.remember = str}>Запомнить меня</InputCheckbox>
							<RippleButton>ВОЙТИ</RippleButton>
						</div>
					</form>

					<p style={{marginTop: '22px', marginBottom: '13px'}}>Еще не получили доступ к видеолекциям?</p>
					<Link to="/register" className="center-button">Создать аккаунт</Link>

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