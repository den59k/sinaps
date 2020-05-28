import React from 'react'
import { Route } from 'react-router-dom'
import { RippleA, InputText, RippleButton } from './../inputs/LoginInputs.jsx'
import { ModalWindowWrapper } from './../inputs/ModalWindow.jsx'
import { MdSearch, MdMoreVert } from 'react-icons/md'
import { ModalGroupAdd, ModalGroup } from './modal-windows.jsx'
import { AlertWrapper } from './../inputs/Alert.jsx'
import { url } from './../../constants'
import { Icon } from './../utils.jsx';

class ConferencesPage extends React.Component {

	constructor(props){
		super(props);
		this.alertRef = React.createRef();
		this.state = {redirect: false, myGroups: null, otherGroups: null, filter: ''}
	}

	onSearch = ({search}) => {
		this.setState({filter: search});
	}

	componentDidMount(){
		fetch(url+'/get-groups', {
			method: 'GET',
			headers: {
				token: this.props.net.token
	  	}
	  }).then(resp => resp.json())
	  .then(jresp => {
	  	if(jresp.errors){
	  		console.error(jresp.errors);
	  		return;
	  	}
	  	this.setState({myGroups: jresp.myGroups, otherGroups: jresp.otherGroups});

	  });
	}

	onSuccess = group => {
		
		this.props.history.push('/c');
		this.setState({myGroups: [group, ...this.state.myGroups]});
		this.alert(`Комната "${group.name}" создана`);
	}

	onClickRow = (group) => {
		this.props.history.push('/c/'+group.link);
	}

	successJoinToRoom = (group) => {
		this.props.history.push('/c');
		this.alert(`Вы добавлены в группу "${group.name}"`);
		this.setState({myGroups: [group, ...this.state.myGroups]});

		const otherGroups = this.state.otherGroups;
		for(let i = 0; i < otherGroups.length; i++)
			if(otherGroups[i].link === group.link){
				this.setState({otherGroup: otherGroups.slice(0, i).concat(otherGroups.slice(i+1))});
				break;
			}
	}

	alert = (str) => {
		setTimeout(() => this.alertRef.current.alert(str), 250);
	}

	render() {

		const getModal = (match) => {
			if(match == null) return null;

			if(match.params.room === 'add') 
				return <ModalGroupAdd 
					cancel={() => this.props.history.push('/c')} 
					net={this.props.net} 
					success={this.onSuccess}/>
					
			return <ModalGroup 
				net={this.props.net}
				link={match.params.room} 
				cancel={() => this.props.history.push('/c')} 
				onSuccess={this.successJoinToRoom}
				onError={() => this.alert(`При добавлении к комнате возникла ошибка`)}
			/>;
		}

		return (
			<AlertWrapper delay={2000} ref={this.alertRef}>
				<Route exact path="/c/:room"> 
				{({match}) => (
				<ModalWindowWrapper modal={getModal(match)}>
					<header className="main-header" style={{justifyContent: 'space-between'}}>
						<h1>Группы</h1>
						<div className="search-div" style={{flexGrow: '2', textAlign: 'center'}}>
							<InputText fields={{search: "Поиск групп..."}} style={{width: '400px', display: 'inline-flex'}} onChange={this.onSearch}>
								<MdSearch size="1.5em"/>
							</InputText>
						</div>
						<RippleA className="transparent" style={{width: '150px'}} to="/c/add">
							Создать группу
						</RippleA>
					</header>
					<main className="conferences">

						{this.state.myGroups && this.state.myGroups.length > -1 && 
							<GroupTable onClickRow={this.onClickRow} title="Группы с вами" 
								groups={this.state.myGroups} filter={this.state.filter}/>}

						{this.state.otherGroups && this.state.otherGroups.length > -1 && 
							<GroupTable onClickRow={this.onClickRow} title="Прочие открытые группы" 
								groups={this.state.otherGroups} filter={this.state.filter}/>}

					</main>
				</ModalWindowWrapper>
				)}
				</Route>
			</AlertWrapper>
		);
	}

}

export default ConferencesPage;

function GroupTable(props) {

	let groups = props.groups;

	if(props.filter && props.filter !== ''){
		const reg = new RegExp(props.filter, 'iu');
		groups = groups.filter(el => (reg.test(el.name) || reg.test(el.admin.name + ' ' + el.admin.surname)))
	}


	return (
		<div>
			<h3>{props.title} <span className="count">{`(${groups.length})`}</span></h3>
			<table className="group-table">
				<thead>
					<tr>
						<th></th>
						<th className="td-title">Название</th>
						<th>Всего участников</th>
						<th>Начало конференции</th>
						<th>Организатор</th>
						<th></th>
					</tr>
				</thead>
				<tbody>
					{groups.map(el => (
						<tr className="tr-group" key={el.link} onClick={() => props.onClickRow(el)}>
							<td className="group-icon"><Icon src={el.icon} name={el.name} size="35" className="group"/></td>
							<td className="td-title">{el.name}</td>
							<td>{el.userCount}</td>
							<td></td>
							<td>{el.admin.name + ' ' + el.admin.surname}</td>
							<td className="group-more">
								<RippleButton className="transparent more-button">
									<MdMoreVert size="1.4em"/>
								</RippleButton>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>);
}

