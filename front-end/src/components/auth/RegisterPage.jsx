import React from 'react'
import {Link} from 'react-router-dom';
import { InputText, InputCheckbox, RippleButton } from './../inputs/LoginInputs.jsx'
import { MdMailOutline } from 'react-icons/md'
import { IoIosArrowBack } from 'react-icons/io'
import { FaKey } from 'react-icons/fa'
import { RiAccountCircleLine } from 'react-icons/ri'
import { url } from './../../constants.jsx'

class LoginPage extends React.Component {

	constructor(props){
		super(props);
		this.loadingFlag = false;

		this.info = {mail: '', name: '', surname: '', pass: '', repeatPass: ''};

		this.state = {errors: {mail: null, name: null, pass: null}};
	}

	register = (e) => {
		e.preventDefault();
		if(this.loadingFlag)
			return;

		const errors = {mail: null, name: null, pass: null};

		const reg = /^([A-Za-z0-9_\-.])+@([A-Za-z0-9_\-.])+.([A-Za-z]{2,4})$/;
		if(reg.test(this.info.mail) === false)
			errors.mail = 'Нет такого email, и быть не может';

		if(this.info.mail === '')
			errors.mail = 'Поле "Email" должно быть заполнено';

		if(this.info.surname === '')
			errors.name = 'Поле "Фамилия" должно быть заполнено';

		if(this.info.name === '')
			errors.name = 'Поле "Имя" должно быть заполнено';

		if(this.info.repeatPass !== this.info.pass)
			errors.pass = 'Пароли не совпадают';

		if(this.info.pass === '')
			errors.pass = 'Поля "Пароль" должно быть заполнено';

		this.setState({errors});

		for(let key in errors)
			if(errors[key] !== null)
				return;

		//this.loadingFlag = true;

		fetch(url+'/registration', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json;charset=utf-8',
				'token': '000000'
	  	},
			body: JSON.stringify(this.info) })
		.then(response => response.json())
		.then(res => {
			this.loadingFlag = false;
			if(res.errors){
				Object.assign(errors, res.errors);
				this.setState({errors});
				return;
			}

			console.log(res);

		});

	}

	onChange = str => {
		Object.assign(this.info, str);
		const errors = Object.assign({}, this.state.errors);
		for(let key in str)
			switch(key){
				case 'mail': errors.mail = null; break;
				case 'name':
				case 'surname': errors.name = null; break;
				case 'pass':
				case 'repeatPass': errors.pass = null; break;
				default: 
			}
		this.setState({errors});
	}

	render() {
		return (
			<div className="login-page anim down" style={{maxWidth: '900px', minHeight: '90vh'}}>
				
				<div className="login-label" style={{marginLeft: '0', height: '330px'}}>
					<Link className="toBack" to="/"><IoIosArrowBack size="1.8em"/>Вход в аккаунт</Link>
					<p>Уже 85 человек получили доступ к видеолекциям. <span className="orange">Присоединяйтесь и вы.</span></p>
				</div>

				<div className="login-column">
					<form className="login-form register-form" onSubmit={this.register}>
						<h1>Создание аккаунта</h1>
						<div className="form-flex">
							<InputText 	error={this.state.errors.mail} fields={{mail: "E-mail"}} type="text" 
										onChange={this.onChange}>
								<MdMailOutline size="1.6em"/>
							</InputText>
							<InputCheckbox style={{margin: '12px 22px'}} onChange={(str) => this.remember = str}>Получать уведомления</InputCheckbox>
						</div>
						<InputText 	fields={{name: 'Имя', surname: 'Фамилия'}} type="text"
											onChange={this.onChange} error={this.state.errors.name}>
							<RiAccountCircleLine size="1.6em"/>
						</InputText>
						<InputText  fields={{pass: 'Пароль', repeatPass: 'Повтор пароля'}} type="password"
											onChange={this.onChange} error={this.state.errors.pass}>
							<FaKey size="1.3em"/>
						</InputText>
						<div className="last-button">
							<RippleButton>ПРОДОЛЖИТЬ</RippleButton>
						</div>
					</form>
				</div>
			</div>
		);
	}

}

export default LoginPage;