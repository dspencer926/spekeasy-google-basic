import React, { Component } from 'react';
import './App.css';
import Translation from './components/Translation';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      text: '',
      username: null,
      isLogged: false,
    }
  }



  render() {
    return (
      <div className="App">
        <Translation />
      </div>
    );
  }
}

export default App;
