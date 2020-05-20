import React from 'react'

export class AlertWrapper extends React.Component {

	constructor(props){
		super(props);
		this.state = {className: '', message: null}
		this.delay = this.props.delay || 2000;
	}

	alert(message){
		if(this.timeout)
			clearTimeout(this.timeout);
		this.setState({message});
		setTimeout(() => this.setState({className: 'alert-active'}), 50);
		this.timeout = setTimeout(() => {
			this.setState({className: 'alert-exit'});
			setTimeout(() => this.setState({message: null}), 500); 
		}, this.delay);
	}

	componentWillUnmount(){
		if(this.timeout)
			clearTimeout(this.timeout);
	}

	render(){
		return (
		<React.Fragment>
			{this.props.children}
			<div className="alert-wrapper">
				{this.state.message && (
					<div className={'alert '+this.state.className}>
						{this.state.message}
					</div>	
				)}
			</div>
		</React.Fragment>
		);
	}

}