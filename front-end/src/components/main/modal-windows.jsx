import React, {useEffect, useState} from 'react'
import { ModalWindow, ModalWindowBase } from './../inputs/ModalWindow.jsx'
import { InputText, SegmentButton, RippleButton, RippleA } from './../inputs/LoginInputs.jsx'
import { TiGroup } from 'react-icons/ti'
import { MdExpandMore } from 'react-icons/md'
import { url } from './../../constants'
import { numeral } from './../../tools/rus.js';
import { Icon } from './../utils.jsx'

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
		if(this.roomInfo.name.length < 4){
			this.setState({errors: {name: 'Слишком короткое название'}})
			return;
		}

		fetch(url+'/create-new-group', {
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

  		this.props.success(resp);

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

export function ModalGroup (props) {

	const [group, setGroup] = useState(null);
	const token = props.net.token;

	useEffect(() => {

		fetch(url+'/get-group/'+props.link, {
			method: 'GET',
			headers: { token }
		}).then(resp => resp.json())
		.then(jresp => {
			if(jresp.error)
				console.error(jresp);
			setGroup(jresp);
		});
	}, [props.link, token]);

	const onSubmit = () => {
		fetch(url+'/join-group', {
			method: 'POST',
			headers: { 
				token,
				'Content-Type': 'application/json;charset=utf-8'
		 	},
		 	body: JSON.stringify({group: props.link})
		}).then(resp => resp.json())
		.then(jresp => {
			if(jresp.error){
				console.error(jresp.error);
				props.onError();
			}
			else
				props.onSuccess(jresp);
		});
	}

	let title = props.link;
	if(group !== null)
		title = group.name;
	return (
		<ModalWindowBase 
			title={title} 
			cancel={props.cancel} 
			success={"Вступить"} 
			disabled={group===null}
			className="group-info"
		>
			{(group !== null) && <div style={{width: '400px', textAlign: 'center'}}>
				<RippleButton className="transparent more">
					{group.userCount + ' ' + numeral(group.userCount, 'участник', 'участника', 'участников')}
					{(group.users > 6) && <MdExpandMore size="1.5em"/>}
				</RippleButton>
				<div style={{margin: '3px 0'}}>
					{group.users.map(user => <Icon profile={user} key={user.login} size="50"/>)}
				</div>
				{group.my?(
					<RippleA to={'/'+props.link} >Перейти к сообщениям</RippleA>
				):(
				<div className="modal-buttons">
					<RippleButton className="transparent" onClick={props.cancel}>
						Отмена
					</RippleButton>
					<RippleButton onClick={onSubmit}>
						Вступить
					</RippleButton>
				</div>
				)
				}
			</div>}
		</ModalWindowBase>
	);

}