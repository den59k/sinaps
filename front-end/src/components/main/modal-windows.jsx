import React from 'react'
import { ModalWindow, ModalWindowBase } from './../inputs/ModalWindow.jsx'
import { InputText, SegmentButton } from './../inputs/LoginInputs.jsx'
import { TiGroup } from 'react-icons/ti'

export class ModalGroupAdd extends React.Component {

	constructor(props){
		super(props);
		this.roomInfo = {name: '', type : 'public'}
		this.state = {errors: {name: null}}
		this.url = this.props.net.url;
	}

	onChange = str => {
		Object.assign(this.roomInfo, str);
		this.setState({errors: {name: null}});
	}

	changeSegment = str => {
			this.roomInfo.type = str;
	}

	submit = () => {
		this.roomInfo.name = this.roomInfo.name.trim();
		if(this.roomInfo.name.length < 3){
			this.setState({errors: {name: 'Слишком короткое название'}})
			return;
		}

		fetch(this.url+'/create-new-group', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json;charset=utf-8',
				token: this.props.net.token
	  	},
	  	body: JSON.stringify(this.roomInfo)
	  }).then(response => response.json())
	  .then(resp => {
	  	if(resp.errors){
	  		this.setState({errors: resp.errors});
	  		return;
	  	}
	  	if(resp.success)
	  		this.props.success(resp.success);
	  	console.log(resp);
	  });

	}

	render() {

		return (
			<ModalWindow 	title="Создать группу" cancel={this.props.cancel} 
										success="Создать группу" onSubmit={this.submit}>
				<div style={{width: '500px', padding: '0 10px'}}>
					<InputText  fields={{name: "Название группы"}} style={{width: '400px', margin: '0 auto'}} 
						onChange={this.onChange} error={this.state.errors.name}>
						<TiGroup size="1.5em"/>
					</InputText>

					<SegmentButton title="Тип" fields={{public: 'Публичная', private: 'Закрытая'}} 
					style={{width: '260px', margin: '20px auto'}} value="public" onChange={this.changeSegment}/>
				</div>
			</ModalWindow>
		);
	}

}

export class ModalGroup extends React.Component {

	componentDidMount

	render(){
		return (
			<ModalWindowBase title={this.props.link} cancel={this.props.cancel} success={"Вступить"} disabled={true}>
				<div style={{width: '400px'}}>


				</div>
			</ModalWindowBase>
		);
	}

}