import React from 'react'
import { Redirect, BrowserRouter, Route, Switch } from 'react-router-dom';
import NavigationBar from './NavigationBar.jsx';
import "./../css/main-page.sass"

import HomePage from './main/HomePage.jsx'
import MessagesPage from './main/MessagesPage.jsx'
import ConferencesPage from './main/ConferencesPage.jsx'

class MainPage extends React.Component {

	constructor(props){
		super(props);

		this.state = {animActive: false}
	}

	componentDidMount(){

	}

	render() {
		if(this.props.net.token === null) return (<Redirect to='/auth'/>);

		const routes = [
			{ path: '/c', Component: ConferencesPage},
			{ path: '/'+this.props.net.profile.login, Component: HomePage},
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