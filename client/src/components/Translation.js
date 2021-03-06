import React, { Component } from 'react';
import responsiveVoice from '../responsiveVoice.js';
const io = require('socket.io-client')('/');
const ss = require('socket.io-stream');
const MSR = require('msr');

class Translation extends Component {
  constructor(props) {
    super(props);
    this.state = {
      langFrom: 'en',                                               //  source language code (from drop-down)
      langTo: 'es',                                                 //  target language code (from drop-down)
      speakLang: '',                                                //  language-code for TTS to speak
      inputText: '',                                                //  input text to be translated
      recogResult: '',                                              //  result of speech recog
      stsTranslation: '',                                           //  STS translation
      responseBox: '',                                              //  translated text/response to be displayed   
      result: '',                                                   //  translated text in target language
      isRecording: false,                                           //  true/false is currently recording voice
      rdyToRecord: true,                                            //  true/false is ready to record
      recClass: 'off',                                              //  class for record button animation
      textStyle: null,                                              //  for animation of text
      resultStyle: null,                                            //  ''
      status: null,                                                 //  status of app overall for user to view
      sendStyle: {backgroundColor: '#FF5E5B'},                      //  bkgrnd color of send button
      volume: 255,
    }
    this.recorderInitialize = this.recorderInitialize.bind(this);
    this.translateAgain = this.translateAgain.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.switchLangs = this.switchLangs.bind(this);
    this.clear = this.clear.bind(this);
    this.speak = this.speak.bind(this);

    // receive translation and sts translation
    io.on('sts', (response) => {
      this.setState((prevState) => { 
        return {
          inputText: response.stsTranslation,
          rdyToRecord: true,
          result: response.translation,
          responseBox: this.state.convoMode? prevState.responseBox : response.translation,
          resultStyle: 'text-animate',
          status: this.state.convoMode? 'Ready to send message' : 'Ready for input',
          sendStyle: this.state.convoMode? {backgroundColor: 'lightgreen'} : {backgroundColor: '#FF5E5B'},
          canSend: this.state.convoMode? true: false,
        }
      }, () => {
        if (!this.state.convoMode) {
          this.speak();
        }
      })
    })

    // receive voice recognition response
    io.on('recognized', (message) => {
      console.log(message);
      this.setState({inputText: message,})
    })

    io.on('recog-error', () => {
      console.log('error');
      this.setState({
        rdyToRecord: true,
        status: 'Recording error.  Please try again.',
      });
    })

  }


componentDidMount() {
  this.setState({
    status: 'Ready for input',
  });
  this.recorderInitialize()
}

//sets state to handle changes
handleChange(e, field) {
  this.setState({
    [field]: e.target.value,
  });
}

switchLangs() {
  this.setState((prevState) => { 
    return {
      langFrom: prevState.langTo,
      langTo: prevState.langFrom,
    }
  })
}

// resends inputText for re-translation
translateAgain(e) {
  this.setState({resultStyle: null});
  let data = {
    message: this.state.inputText,
    from: this.state.langFrom,
    to: this.state.langTo,
  }
  io.emit('translate again', data);
}


//runs TTS module
  speak() {
    console.log('in speak function');
    let speakLang;
    let inputLang = this.state.convoMode? this.state.langFrom : this.state.langTo;
    function chooseLang(input) {
      return ({
      'es': 'Spanish Latin American Female',
      'fr': 'French Female',
      'pt': 'Brazilian Portuguese Female',
      'ru': 'Russian Female',
      'hi': 'Hindi Female',
      'it': 'Italian Female',
      'ar': 'Arabic Male',
      'zh-cn': 'Chinese Female',
      'ja': 'Japanese Female',
      'de': 'Deutsch Female',
      'en': 'US English Female',
      'vi': 'Vietnamese Male',
      }[input])
    }
    speakLang = chooseLang(inputLang);
    let response = this.state.responseBox
    this.setState({speakLang: speakLang})
    console.log(this.state.responseBox, speakLang);
    responsiveVoice.speak(response, speakLang);
  }


//clears both input/result divs
  clear() {
    this.setState({
      inputText: '',
      result: ''
    });
  }


  recorderInitialize() {
    let record = document.getElementById('start-recog');
    let container = document.getElementById('recognize-button-container');
    let newBlob, looper, interval;
    if (navigator.mediaDevices) {
      console.log('getUserMedia supported.');
      let constraints = { audio: true };
      navigator.mediaDevices.getUserMedia(constraints)
      .then((stream) => {
        let mediaRecorder = new MSR(stream);
        mediaRecorder.audioChannels = 1;
        mediaRecorder.mimeType = 'audio/wav';
        mediaRecorder.ondataavailable = function (blob) {
          newBlob = blob;
        };

        let visualize = (stream) => {
          let context = new AudioContext();
          let analyser = context.createAnalyser();
          let src = context.createMediaStreamSource(stream);
          src.connect(analyser);
          looper = () => {
            if (this.state.isRecording) {
              analyser.fftSize = 32;
              let fbcArray = new Uint8Array(analyser.frequencyBinCount);
              analyser.getByteFrequencyData(fbcArray);
              let total = fbcArray.reduce((previous, current) => current += previous);
              let volume = total / fbcArray.length;
              let color = (Math.floor(volume * 2));
              let colorReverse = 255 - (Math.floor(volume * 2));
              if (volume > 30) {
                record.style = `color: rgb(${colorReverse}, ${colorReverse}, ${colorReverse})`
                container.style = `background-color: rgb(255, ${color}, ${color})`;
              } else {
                record.style = 'color: white';
                container.style = 'background-color: rgb(255, 94, 91)';
              }
            }
          }
        }

        visualize(stream);

        container.onclick = () => {
          let interval = setInterval(looper, 45);
          let sStream = ss.createStream();
          let data = {
            langFrom: this.state.langFrom,
            langTo: this.state.langTo,
          }
          ss(io).emit('stream', sStream, data);
          if (this.state.rdyToRecord === true) {
            mediaRecorder.start(20000);
            this.setState({
              recClass: 'rec',
              status: 'Recording input',
              isRecording: true,
              rdyToRecord: false,
            }, () => {console.log("recorder started - status: ", this.state.status)})
          }
        else if (this.state.isRecording === true) {
          mediaRecorder.stop();
          this.setState({
            recClass: 'off',
            status: 'Processing audio',
            isRecording: false,
            rdyToRecord: true,
            volume: 255,
          }, () => {
              clearInterval(interval);
              console.log('stopped')
              ss.createBlobReadStream(newBlob).pipe(sStream);
              console.log("recorder stopped - status: ", this.state.status);
            })
          }
        }
      })
  } else {
    console.log('Audio doesnt work');
  }
}

  render() {
    return (
      <div id='translation-container'>
      <p style={{textAlign: 'center'}}>Welcome to Speakeasy!  Choose your languages, then click the mic once to start recording, and again when you're done!</p>
        <div id='translation-div'>
          <div id='input-div'>
            {this.state.usernameEntry ? 
            <div id='username-div'>
              {this.state.signedIn ? 
              <div id='logged-in-info'>
                <p>You are currently signed in as {this.state.myUserInfo.username}</p>
                <button onClick={this.signOff}>Sign Off</button>
              </div>
              : <div id='username-input-div'>
                <input id='username-entry' type='text' onChange={(e) => {this.handleChange(e, 'username')}}></input>
                <button id='username-submit' onClick={this.usernameSubmit}> -> </button>
              </div>}
              {this.state.chattingWith === null ? 
              <div id='user-select-div'>
                <select id='current-users' size='4' multiple='multiple' onChange={(e) => {this.handleChange(e, 'userSelected')}}>
                  {this.state.usersOnline.map((user) => {
                    return <option>{user.username}</option>
                  })}
                </select>
                <button id='choose-chat-user' onClick={this.userChatSelect}>Connect</button>
              </div>
              : <div id='chatting-with'>
                <p> You are currently chatting with {this.state.chattingWith.username}</p>
                <button onClick={this.disconnect}>Disconnect</button>
              </div>}
              <div id='convo-window-buttons'>
                <button onClick={this.leaveConvoMode}>Leave Convo Mode</button>
                <button onClick={this.closeConvoWindow}>OK</button>
              </div>
            </div>
            : null}
            <form id='translation-form'>
              <textarea id='input-box' name='text' rows='3' value={this.state.inputText} className={this.state.textStyle} onChange={(e) => this.handleChange(e, 'inputText')}/>
                <div id='to-from-div'>
                    <select name='langFrom' className='langInput' value={this.state.langFrom} id='langFrom' onChange={(e) => {this.handleChange(e, 'langFrom')}}> 
                      <option value='en'>English</option>
                      <option value='es'>Spanish</option>
                      <option value='fr'>French</option>
                      <option value='pt'>Portuguese</option>
                      <option value='it'>Italian</option>
                      <option value='ru'>Russian</option>
                      <option value='ar'>Arabic</option>
                      <option value='zh-cn'>Chinese</option>
                      <option value='ja'>Japanese</option>
                      <option value='de'>German</option>
                      <option value='iw'>Hebrew</option>
                      <option value='fi'>Finnish</option>
                      <option value='hi'>Hindi</option>
                      <option value='ko'>Korean</option>
                      <option value='tr'>Turkish</option>
                      <option value='vi'>Vietnamese</option>
                    </select>
                  <div id='yellow'></div>
                  <div id='triangle-div'>
                    <div id='exchg-arrows' onClick={this.switchLangs}>
                      <i className="fa fa-exchange fa-2x" aria-hidden="true"></i>
                    </div>
                    <div id='triangle-topleft'></div>
                    <div id='triangle-bottomright'></div>
                  </div>
                  <div id='green'></div>
                    <select name='langTo' id='langTo' className='langInput' value={this.state.langTo} onChange={(e) => {this.handleChange(e, 'langTo')}}> 
                      <option value='en'>English</option>
                      <option value='es'>Spanish</option>
                      <option value='fr'>French</option>
                      <option value='pt'>Portuguese</option>
                      <option value='it'>Italian</option>
                      <option value='ru'>Russian</option>
                      <option value='ar'>Arabic</option>
                      <option value='zh-cn'>Chinese</option>
                      <option value='ja'>Japanese</option>
                      <option value='de'>German</option>
                      <option value='iw'>Hebrew</option>
                      <option value='fi'>Finnish</option>
                      <option value='hi'>Hindi</option>
                      <option value='ko'>Korean</option>
                      <option value='tr'>Turkish</option>
                      <option value='vi'>Vietnamese</option>
                    </select>
                  </div>
              <textarea id='result-box' name='result' rows='3' value={this.state.responseBox} className={this.state.resultStyle} onChange={(e) => this.handleChange(e, 'result')}></textarea>
            </form>
          </div>
          <div id='controls'>
          <div id='bottom-row'>
            <div id='status-div'>{this.state.status}</div>
            <div id='recognize-button-container' style={{backgroundColor:this.state.isRecording ? null : 'black'}}>
              <button id='start-recog'><i style={this.state.isRecording ? null : {color: 'white'}} className={`fa fa-microphone fa-3x`} aria-hidden="true"></i></button>
            </div>
              <button id='clear-btn' onClick={this.clear}>Clear</button>
          </div>
        </div>
      </div>
    </div>
    );
  }
}

export default Translation;
