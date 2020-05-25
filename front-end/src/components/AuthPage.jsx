import React from 'react'
import "./../css/login-page.sass"
import LoginPage from './auth/LoginPage.jsx'
import RegisterPage from './auth/RegisterPage.jsx'
import InfoPage from './auth/InfoPage.jsx'
import { BrowserRouter, Route, Redirect } from 'react-router-dom';
import { CSSTransition } from 'react-transition-group';

class AuthPage extends React.Component {

	constructor(props){
		super(props);
		this.state = {last: null, className:''};
		this.myRef = React.createRef();
	}

	unmount = (e, key) => {

	}

	routes = [
		{ path: '/', Component: LoginPage},
		{ path: '/register', Component: RegisterPage },
		{ path: '/info', Component: InfoPage }
	]

	render() {
		if(this.props.net.token) return (<Redirect to='/'/>);
		return (
			<div className='page login-main-page'>
				<BrowserRouter basename="/auth">
					{this.routes.map(({path, Component}) => (
						<Route key={path} exact path={path}>
							{({match}) => (
								<CSSTransition
									in={match != null}
									timeout={500}
									classNames="changes"
									unmountOnExit
								>
									<div className="animBlock">
										<Component net={this.props.net} onLogin={this.props.onLogin}/>
									</div>
								</CSSTransition>
							)}
						</Route>
						))}

	      </BrowserRouter>
	      <div className="fixed-logo">
	      </div>
			</div>
		);
	}

}

export default AuthPage;