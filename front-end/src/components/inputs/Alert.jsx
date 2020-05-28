import React from 'react'

export class AlertWrapper extends React.Component {

	constructor(props){
		super(props);
		this.state = {className: '', message: null}
		this.delay = this.props.delay || 2000;
		this.timeout = -1;
	}

	alert(message){
		if(this.timeout)
			clearTimeout(this.timeout);
		this.setState({message});
		this.timeout = setTimeout(() => this.setState({className: 'alert-active'}), 50);
		this.timeout = setTimeout(() => {
			this.setState({className: 'alert-exit'});
			this.timeout = setTimeout(() => {
				this.setState({message: null});
				this.timeout = -1;
			}, 500); 
		}, this.delay);
	}

	componentWillUnmount(){
		if(this.timeout >= 0){
			clearTimeout(this.timeout);
			this.timeout = -1;
		}
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