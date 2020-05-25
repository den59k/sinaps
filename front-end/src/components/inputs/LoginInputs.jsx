import React, { useState } from 'react'
import {nanoid} from 'nanoid'
import { Link } from 'react-router-dom'


export class InputText extends React.Component {

	constructor(props){
		super(props);
  	this.type = props.type || "text"
  	this.fields = this.props.fields;
  	
  	this.state = {};
  	for(let key in this.fields)
  		this.state[key] = '';

	}

	handleChange(state) {   
		this.setState(state);
		this.props.onChange(state);
	}

	render() {
		return (
			<div className={'input-text'+(this.props.error?' error':'')} style={this.props.style}>
				{this.props.children}
				{Object.keys(this.fields).map(key => <input type={this.type} value={this.state[key]} 
					onChange={e => this.handleChange({ [key]: e.target.value })} key={key} placeholder={this.fields[key]}/>)}
				{this.props.error && <div className="error-label">{this.props.error}</div>}
			</div>
		);
	}
}


export class InputCheckbox extends React.Component {

	constructor(props){
		super(props);
		const checked = this.props.isChecked || true;
		this.state = {value: checked};
	}

	handleChange = e => {    
		this.setState({value: e.target.checked});  
		this.props.onChange(e.target.checked);

	}

	render(){
		return (
			<label className="input-checkbox" {...this.props} >
				<input type="checkbox" checked={this.state.value} onChange={this.handleChange}/>
				<span className="box-checkbox"></span>
				<span>{this.props.children}</span>
			</label>
		);
	}
}

export class RippleButton extends React.Component {
	constructor(props){
		super(props);
		this.state = { rippleElements: [] }
		this.size = props.size || 100;

		this.style = this.props.style || {};
	}

	rippleEffect = (e) => {
		const rect = e.currentTarget.getBoundingClientRect();

		const newRipple = {
			left: e.clientX - rect.left - this.size/2, top: e.clientY - rect.top - this.size/2, 
			id: nanoid(4), 
			size: this.size
		}

		newRipple.timeout = setTimeout(() => {
			if(this.state.rippleElements.length > 1)
				this.setState({rippleElements: this.state.rippleElements.slice(1)});
			else
				this.setState({rippleElements: []});
		}, 1000);

		this.setState({rippleElements: [...this.state.rippleElements, newRipple]});
	}

	componentWillUnmount(){
		this.state.rippleElements.forEach(el => {
			clearTimeout(el.timeout);
		});
	}

	render(){
		const className = this.props.className || '';
		return (
			<button className={'my-button '+className} onMouseDown={this.rippleEffect} style={this.style}
				onClick={this.props.onClick}>
				{this.props.children}
				{this.state.rippleElements.map((el) => <div className="ripple-effect" 
					style={{top: el.top, left: el.left, width: el.size+'px', height: el.size+'px'}} 
					key={el.id}></div> ) }
			</button>
		);
	}
}

export class RippleA extends RippleButton {

	render(){
		const className = this.props.className || '';
		return (
			<Link to={this.props.to} className={'my-button clear '+className} onMouseDown={this.rippleEffect} style={this.style}
				onClick={this.props.onClick}>
				{this.props.children}
				{this.state.rippleElements.map((el) => <div className="ripple-effect" 
					style={{top: el.top, left: el.left, width: el.size+'px', height: el.size+'px'}} 
					key={el.id}></div> ) }
			</Link>
		);
	}

}

export function HorizontalSlider(props) {

	const [active, setActive] = useState(false);
	let box;

	const mouseMove = (e) => {
		let value = (e.clientX-box.left)/(box.width);
		if(value < 0) value = 0;
		if(value > 1) value = 1;
		if(props.onChange)
			props.onChange(value);
	}

	return (
		<div className={'slider' + (active?' active':'')} {...props}
			onMouseDown={(e) => { 
				e.preventDefault();
				box = e.currentTarget.getBoundingClientRect();
				setActive(true);
				mouseMove(e);
				document.addEventListener('mouseup', () => {
					setActive(false)
					document.removeEventListener('mousemove', mouseMove);
				},{ once: true });
				document.addEventListener('mousemove', mouseMove);
			}}>
			<div className="slider-line"></div>
			<div className="slider-line on" style={{left: 0, width: (props.value*100)+'%'}}></div>
			<div className="slider-point" style={{left: (props.value*100)+'%'}}></div>
		</div>
	);
}

export function SegmentButton(props) {

	const keys = Object.keys(props.fields);

	const [mode, setMode] = useState(props.value || '');

	return (
		<div style={props.style} className={'segment-wrapper '+props.className}>
			<div className="segment-title">{props.title}</div>
			<div className="segment-button">
				{keys.map(key => (
					<button className={(key === mode)?'active':''} 
					onClick={() => {
						setMode(key);
						if(props.onChange)
							props.onChange(key);
					}}
					 key={key}>{props.fields[key]}</button>
				))}
			</div>
		</div>
	);

}