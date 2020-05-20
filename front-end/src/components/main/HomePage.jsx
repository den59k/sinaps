import React from 'react'
import { Link } from 'react-router-dom'
import { Section, ProfileImage, ModalImageEditor } from './tools.jsx'
import { ModalWindowWrapper } from './../inputs/ModalWindow.jsx'
import { AlertWrapper } from './../inputs/Alert.jsx'

class HomePage extends React.Component {

	constructor(props){
		super(props);
		this.modalWrapperRef = React.createRef();
		this.alertRef = React.createRef();

		this.state = {src: null}
		this.maxScale = 2;
	}

	changePhoto = (photo) => {
		const photoUrl = URL.createObjectURL(photo);
		const wrapper = this.modalWrapperRef.current;
		wrapper.openWindow(
			<ModalImageEditor photoUrl={photoUrl} cancel={() => wrapper.closeWindow()} onSubmit={this.renderImage} />
		)
	}



	renderImage = async(buf1, buf2) => {

    //Здесь мы объединяем два изображения в один массив
    const buf = new Uint8Array(buf1.byteLength+buf2.byteLength);
    buf.set(new Uint8Array(buf1), 0);
  	buf.set(new Uint8Array(buf2), buf1.byteLength);

  	//Как тебе такое, Илон Маск?
    const res = await fetch(this.props.net.url+'/upload-profile-image', {
    	method: 'POST',
      headers: {
        'token': this.props.net.token,
        'full-image': buf1.byteLength,
        'mini-image': buf2.byteLength 
      },
      body: buf.buffer
    });

    const jres = await res.json();
    if(jres.error){
    	console.error(jres);
	    this.alertRef.current.alert('Произошла ошибка');
    }
    else{
    	this.props.net.update(jres);
	    this.alertRef.current.alert('Изображение успешно обновлено');
    }
    this.modalWrapperRef.current.closeWindow();
	}


	render() {
		const profile = this.props.net.profile;

		return (
			<ModalWindowWrapper ref={this.modalWrapperRef}>
				<AlertWrapper delay={2000} ref={this.alertRef}>
				<div className="home-page root-block">
					<header className="profile-header">
						<ProfileImage src={this.props.net.profile.fullIcon} alt={profile.name + ' ' + profile.surname} changePhoto={this.changePhoto}/>
						<div className="person-info">
							<h1 className="person-name">{profile.name + ' ' + profile.surname}</h1>
							<h2 className="person-group">студент <Link to={"/"}>АСУ 17-1б</Link></h2>
						</div>
						<p className="expertition">Какая-нибудь сильная цитата</p>
					</header>

					<Section className="profile-section" style={{marginTop: '10px'}} title="Доступные конференции">
						
					</Section>

				</div>
				</AlertWrapper>
			</ModalWindowWrapper>
		);
	}

}

export default HomePage;