import React from 'react'
import { Route, Link } from 'react-router-dom'

import { TiGroup } from 'react-icons/ti'
import { MdSettings, MdMessage } from 'react-icons/md'

import { Icon, Title } from './utils.jsx';

class NavigationBar extends React.Component {

	constructor(props){
		super(props);

		this.state = {title: null, className: 'enter'}
	}

	showTitle = (e) => {
		const target = e.currentTarget;
		this.titleTimeout = setTimeout(() => {
			var box = target.getBoundingClientRect();
			const left = box.right + window.pageXOffset;
			const top = box.top+box.height/2 + window.pageYOffset;
			this.setState({title: {pos: {left, top}, text: target.getAttribute('alt')}});
		}, 600);
	}

	componentDidMount(){
		setTimeout(() => {
			this.setState({className: this.state.className+' enter-active'});
		}, 200);

		setTimeout(() => {
			this.setState({className: ''});
		}, 500);
	}

	hideTitle = (e) => {
		this.setState({title: null});
		clearTimeout(this.titleTimeout);
	}

	render() {
		
		const routes = [
			{ link: '/'+this.props.profile.login, description: this.props.profile.name,
				 Component: <Icon className="hover-opacity" profile={this.props.profile}/> },
			{ link: '/c', description: 'Конференции',
				Component: <TiGroup size="1.2em"/> },
			{ link: '/', description: 'Сообщения',
				Component: <MdMessage/> },
			{ link: '/settings', description: 'Настройки',
				Component: <MdSettings/> }
		];

		return (
			<nav className={"nav-bar " + this.state.className}>
				<Title {...this.state.title} show={this.state.title !== null}/>
				<div className="nav-tools">
						<Route path={"/:page"} >
						{({match} ) => {
							let _link = '/';
							
							if(match !== null)
								for(let r of routes)
									if(r.link === match.url){
										_link = r.link;
										break;
									}

							return routes.map(({link, Component, description}) => (
							<Link className={'nav-link' + (_link===link?' active':'')} 
										key={link}
										to={link} 
										onMouseEnter={this.showTitle} 
										onMouseLeave={this.hideTitle} 
										onClick={this.hideTitle} 
										alt={description}>
								<div className="spline"/>
								{Component}
							</Link>
							))}}
						</Route>
				</div>
			</nav>
		);
	}

}

export default NavigationBar;