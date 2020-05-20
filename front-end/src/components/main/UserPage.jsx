import React from 'react'

export default class UserPage extends React.Component {


	constructor(props){
		super(props);
		console.log();
	}


	render(){
		return(
			<div>
				<h1>{this.props.match.params.user}</h1>

			</div>
		);
	}

}