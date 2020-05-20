import React from 'react'
import 'normalize.css'
import "./css/index.sass"
import AuthPage from './components/AuthPage.jsx'
import MainPage from './components/MainPage.jsx'

import { BrowserRouter, Route, Switch } from 'react-router-dom';

class App extends React.Component {

  constructor(props){
    super(props);
    this.state = {
      net: {
        url: 'http://localhost',
        dbUrl: 'http://localhost',
        socket: null,
        token: null,
        profile: null,
        login: null,
        update: this.update
      }
    }

    if(sessionStorage.getItem('token')){
      this.state.loading = true;
    }
  }

  update = (u) => {
    if(u.fullIcon) u.fullIcon = this.state.net.dbUrl+u.fullIcon;
    if(u.icon) u.icon = this.state.net.dbUrl+u.icon;

    const profile = Object.assign({}, this.state.net.profile, u);

    const net = Object.assign({}, this.state.net, {profile});
    console.log(net);
    this.setState({net});
  }

  componentDidMount(){
    if(this.state.loading){
      fetch(this.state.net.url+'/i-have-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=utf-8'
        },
        body: JSON.stringify({token: sessionStorage.getItem('token')}) })
      .then(response => response.json())
      .then(res => {
        if(res.error){
          sessionStorage.removeItem('token');
          this.setState({loading: false});
          return;
        }
        this.onLogin(res);
      });
    }
  }

  onLogin = u => {
    const socket = new WebSocket("ws://localhost");
    const net = Object.assign({}, this.state.net, u);
    if(net.profile.fullIcon) net.profile.fullIcon = net.dbUrl+net.profile.fullIcon;
    if(net.profile.icon) net.profile.icon = net.dbUrl+net.profile.icon;
    net.socket = socket;
    socket.onopen = () => { 
      socket.send(JSON.stringify({type: 'auth', token: u.token})); 
    }
    socket.onclose = (e) =>{
      console.log('Веб-сокет закрыт. Причина:', e.reason);
    }
    console.log(net);

    sessionStorage.setItem('token', u.token);

    this.setState({net, loading: false});
  }

  render() { 
    if(this.state.loading) return  <div></div>
    return (
      <BrowserRouter>
        <Switch>
          <Route path='/auth' render={(props) => <AuthPage net={this.state.net} onLogin={this.onLogin}/>}/>
          <Route path='/' render={() => <MainPage net={this.state.net}/>}/>
        </Switch>
      </BrowserRouter>
    );
  }
}

export default App;
