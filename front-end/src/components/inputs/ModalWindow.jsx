import React from 'react'
import {RippleButton, RippleA} from './LoginInputs.jsx'
import Loader from './Loader.jsx'
import cn from 'classnames'

export class ModalWindowBase extends React.Component {

	constructor(props){
		super(props);

		this.state={bkgClassName: ' enter', modalClassName: ' enter'}
	}

	bkgClick = (e) => {
		if(e.target === e.currentTarget){
			if(this.props.cancel)
				this.props.cancel();

		}
	}

	componentDidMount(){
		setTimeout(() => {
			this.setState({bkgClassName: ' enter-active', modalClassName: ' enter-active'})
		}, 50);

		setTimeout(() => {
			this.setState({bkgClassName: '', modalClassName: ''})
		}, 400);
	}

	render() {


		return (
			<div className={'modal-window-bkg' + this.state.bkgClassName} onMouseDown={this.bkgClick}>
				<div className={cn('modal-window', this.state.modalClassName, this.props.className)}>
					{this.props.disabled && <div className="disabled-fill"><Loader size="70"/></div>}
					<h3 className="modal-title">{this.props.title}</h3>
					{this.props.children}
				</div>
			</div>
		);
	}
}

export function ModalWindow(props){
	return (
		<ModalWindowBase disabled={props.disabled} title={props.title} cancel={props.cancel}>
			{props.children}
			<div className="modal-buttons">
				{props.cancelTo && <RippleA style={{marginRight: '10px', fontWeight: '600'}} 
					className="transparent" to={props.cancelTo}>Отмена</RippleA>}
				{props.cancel && <RippleButton style={{marginRight: '10px', fontWeight: '600'}} 
					className="transparent" onClick={props.cancel}>Отмена</RippleButton>}
				<RippleButton style={{}} onClick={props.onSubmit}>{props.success?props.success:'Сохранить'}</RippleButton>
			</div>
		</ModalWindowBase>
	);
}

export class ModalWindowWrapper extends React.Component {

	constructor(props){
		super(props);
		this.state = {fixedBody: null, modal: null}
		this.ref = React.createRef();
	}

	openWindow(modal){

		this.setState({fixedBody: {top: -window.pageYOffset, left: -window.pageXOffset}, modal});
	}

	closeWindow(){
		this.setState({fixedBody: null, modal: null});
	}

	componentDidMount(){
		if(this.props.modal)
			this.openWindow(this.props.modal);
	}

	componentDidUpdate(prevProps, prevState){
		if(this.state.fixedBody === null && prevState.fixedBody !== null){
			window.scrollTo(-prevState.fixedBody.left, -prevState.fixedBody.top);
		}

		if(!prevProps.modal && this.props.modal)
			this.openWindow(this.props.modal);
		
		if(prevProps.modal && !this.props.modal)
			this.closeWindow();
	}

	render(){
		return (
		<React.Fragment>
			<div ref={this.ref} style={this.state.fixedBody?{...this.state.fixedBody, position: 'fixed', right: '0'}:{}}>
				{this.props.children}
			</div>
			{this.state.modal}
		</React.Fragment>
		);
	}

}