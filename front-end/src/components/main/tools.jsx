import React from 'react'
import { MdFileUpload, MdZoomOut, MdZoomIn } from 'react-icons/md'
import { ModalWindow } from './../inputs/ModalWindow.jsx'
import { HorizontalSlider } from './../inputs/LoginInputs.jsx'
import Loader from './../inputs/Loader.jsx'
import { dbUrl } from './../../constants.jsx'

export class ProfileImage extends React.Component {

	constructor(props){
		super(props);
		this.loadRef = React.createRef();
		this.state = {showPopup: ''}
	}

	showImageTools = () => {
		this.setState({showPopup: ' active'});
	}

	hideImageTools = () => {
		this.setState({showPopup: ''});
	}

	loadPhoto = e => {
		if(e.target.files.length > 0){
			this.props.changePhoto(e.target.files[0]);
		}
	}

	render(){
		let render;

		if(this.props.src)
			render = <img className="full-profile-image" src={dbUrl+this.props.src} alt={this.props.alt} />
		else
			render = <div className="full-profile-image null-image" alt={this.props.alt}></div>

		return (
			<div className="edit-image" onClick={() => this.loadRef.current.click()}
 			onMouseEnter={this.showImageTools} onMouseLeave={this.hideImageTools}>
				<div className={'popup'+ this.state.showPopup}>
					<MdFileUpload size="3em"/>
					<div className='popup-label'>обновить изображение</div>
				</div>

				<input type="file" name="photo" style={{display:'none'}} 
				ref={this.loadRef} onChange={this.loadPhoto} accept="image/png, image/jpeg"/>

				{render}
			</div>)
	}

}

export function Section(props) {
	return <section style={props.style} className={props.className}>
		<h3>{props.title}</h3>
		{props.children}
	</section>
}

function delay(time){
	return new Promise((res, rej) => {
		setTimeout(res, time);
	});
}

export class ModalImageEditor extends React.Component {

	constructor(props){
		super(props);
		this.state = {modalChangePhoto: false, movePos: {x: 0, y: 0}, scale: 0.1, processed: false}
		this.maxScale = 1
		this.minScale = 0
		this.imgRef = React.createRef();
	}

	componentDidMount(){
		setTimeout(() => this.setState({photoUrl: this.props.photoUrl}), 300);
	}

	imageLoaded = e => {
		this.sizeImage = {width: e.target.naturalWidth, height: e.target.naturalHeight};
		this.minScale = 200/Math.min(this.sizeImage.width, this.sizeImage.height);

		const scale = this.minScale+(this.maxScale-this.minScale)*0.1;

		this.setState({movePos: {x: (-this.sizeImage.width+200/scale)/2, y: (-this.sizeImage.height+200/scale)/2}, scale });
	}


	startMoveImage = e => {
		this.lastPos = {x: e.clientX, y: e.clientY};

		document.addEventListener('mouseup', ev => {
			ev.preventDefault();
			document.removeEventListener('mousemove', this.moveImage);
		}, {once: true});

		document.addEventListener('mousemove', this.moveImage);

		e.preventDefault();
	}

	editPosImage = (deltaX, deltaY, scale) => {
		const movePos = Object.assign({}, this.state.movePos);
		movePos.x += deltaX/scale;
		movePos.y += deltaY/scale;

		if(movePos.x > 0) movePos.x = 0;
		if(movePos.y > 0) movePos.y = 0;
		if(movePos.x - 200/scale < -this.sizeImage.width)
			movePos.x = -this.sizeImage.width+200/scale
		if(movePos.y - 200/scale < -this.sizeImage.height)
			movePos.y = -this.sizeImage.height+200/scale

		this.setState({movePos});
	}

	moveImage = e => {
		const deltaX = e.clientX-this.lastPos.x;
		const deltaY = e.clientY-this.lastPos.y;

		this.editPosImage(deltaX, deltaY, this.state.scale);

		this.lastPos = {x: e.clientX, y: e.clientY};
	}

	changeZoom = (value) => {
		if(value < 0) value = 0
		if(value > 1) value = 1
		const scale = this.minScale+value*value*(this.maxScale-this.minScale);
		const oldScale = this.state.scale;
		this.editPosImage(((oldScale-scale)*100)/oldScale, ((oldScale-scale)*100)/oldScale, scale);
		this.setState({scale});
	}

	getValue = () => {
		return Math.sqrt((this.state.scale-this.minScale)/(this.maxScale-this.minScale));
	}

	submitPhoto = async () => {

		this.setState({processed: true});
		await delay(200);
		const pos = {
			x: -this.state.movePos.x, 
			y: -this.state.movePos.y, 
			width: 200/this.state.scale, 
			height: 200/this.state.scale,
			img: this.imgRef.current
		}

		const canvas = document.createElement('canvas');
	    canvas.width = 512;
	    canvas.height = 512;
	    const ctx = canvas.getContext("2d", {alpha: false});
	    ctx.drawImage(pos.img, pos.x, pos.y, pos.width, pos.height, 0, 0, 512, 512);

	   	const _canvas = document.createElement('canvas');
	   	_canvas.width = 96;
	   	_canvas.height = 96;
	   	const _ctx = _canvas.getContext("2d", {alpha: false, antialias: true});
	   	_ctx.drawImage(canvas, 0, 0, 512, 512, 0, 0, 96, 96);

	    const buf1 = await this.getBuffer(canvas);
	    const buf2 = await this.getBuffer(_canvas);
	    canvas.remove();
	    _canvas.remove();
	    this.props.onSubmit(buf1, buf2);
	}

	getBuffer(canvas){
		return new Promise((res, rej) => {
			try{
				canvas.toBlob(blob => blob.arrayBuffer().then(buffer => res(buffer)), 'image/jpeg', 0.6);
			}catch (e){
				rej(e);
			}
		});
	}

	render(){
		return (
		<ModalWindow title="Фото профиля" cancel={this.props.cancel} onSubmit={this.submitPhoto} disabled={this.state.processed}>
			<div className="changePhoto" style={{width: '500px', height: '300px'}} onMouseDown={this.startMoveImage}>
				<img src={this.state.photoUrl} alt=""
				style={{transformOrigin: `0 0`,
								transform: `scale(${this.state.scale}) 
								translate(${this.state.movePos.x+150/this.state.scale}px, ${this.state.movePos.y+50/this.state.scale}px) `,
							}}/>
				<div className="black"></div>
				<div className="changePhoto-photo" style={{width: '200px', height: '200px', top: '50px', left: '150px'}}>
					<div className="loader-wrapper"><Loader size="70"/></div>
					<img src={this.state.photoUrl} onLoad={this.imageLoaded} alt="" ref={this.imgRef}
					style={{
						transformOrigin: `0 0`,
						transform: `scale(${this.state.scale}) translate(${this.state.movePos.x}px, ${this.state.movePos.y}px) `,
					}}/>
				</div>
			</div>
			<div style={{marginTop: '15px'}} className="slider-wrapper">
				<div className="zoom-icon" onClick={() => this.changeZoom(this.getValue()-0.1)}><MdZoomOut size="1.6em"/></div>
				<HorizontalSlider value={this.getValue()} 
					onChange={this.changeZoom} 
					style={{width: '200px', verticalAlign: 'middle'}}/>
				<div className="zoom-icon" onClick={() => this.changeZoom(this.getValue()+0.1)}><MdZoomIn size="1.6em"/></div>
			</div>
		</ModalWindow>
		)
	}
}


