import React from 'react'
import { Redirect, BrowserRouter, Route, Switch } from 'react-router-dom';
import NavigationBar from './NavigationBar.jsx';
import "./../css/main-page.sass"

import HomePage from './main/HomePage.jsx'
import MessagesPage from './main/MessagesPage.jsx'
import ConferencesPage from './main/ConferencesPage.jsx'
import SettingsPage from './main/SettingsPage.jsx'

class MainPage extends React.Component {

	constructor(props){
		super(props);

		this.state = {animActive: false}
	}

	onMessage = (e) => {
		const obj = JSON.parse(e.data);
		this.props.net.emitter.emit(obj.type, obj.data);
	}

	componentDidMount(){
		if(this.props.net.socket)
			this.props.net.socket.addEventListener('message', this.onMessage);
	}

	componentWillUnmount(){
		if(this.props.net.socket)
			this.props.net.socket.removeEventListener('message', this.onMessage);
	}

	render() {
		if(!this.props.net.socket)
			return <Redirect to="/auth"/>
		const routes = [
			{ path: '/c', Component: ConferencesPage},
			{ path: '/'+this.props.net.profile.login, Component: HomePage},
			{ path: '/settings', Component: SettingsPage },
			{ path: ['/:bind', '/'], Component: MessagesPage},
		]

		return (
		<div className="anim up">
			<BrowserRouter>
				<NavigationBar profile={this.props.net.profile}/>
				<Switch>
					{routes.map(({path, Component}) => (
						<Route 	key={(typeof path === 'string')?path:path[0]} path={path} 
										render={(props) => <Component {...props} net={this.props.net} /> } />
						))}
				</Switch>
			</BrowserRouter>
		</div>
		);
	}

}

export default MainPage;