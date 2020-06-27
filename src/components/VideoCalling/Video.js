import React, {Component} from 'react';
import {View, StyleSheet, NativeModules, Platform, Text} from 'react-native';
import {RtcEngine, AgoraView} from 'react-native-agora';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import AntIcon from 'react-native-vector-icons/AntDesign';
import {AppId, ChannelName} from 'react-native-dotenv';
import Image from '../ImageViewBackground';
import Avatar from '../../assets/sampleImages/avatar1.jpg';
import {useNavigation} from '@react-navigation/native';
import {TouchableOpacity} from 'react-native-gesture-handler';
const {Agora} = NativeModules; //Define Agora object as a native module
const {FPS30, AudioProfileDefault, AudioScenarioDefault, Adaptative} = Agora; //Set defaults for Stream

class CallPerson extends Component {
  constructor(props) {
    super(props);
    this.state = {
      peerIds: [], //Array for storing connected peers
      uid: Math.floor(Math.random() * 100), //Generate a UID for local user
      appid: AppId, //Enter the App ID generated from the Agora Website
      channelName: ChannelName, //Channel Name for the current session
      vidMute: true, //State variable for CallPerson Mute
      audMute: false, //State variable for Audio Mute
      speakerMute: true, //State variable for Audio Mute
      joinSucceed: false, //State variable for storing success
      seconds: 0,
      minutes: 0,
    };
    if (Platform.OS === 'android') {
      const config = {
        //Setting config of the app
        appid: this.state.appid, //App ID
        channelProfile: 0, //Set channel profile as 0 for RTC
        videoEncoderConfig: {
          //Set CallPerson feed encoder settings
          width: 720,
          height: 1080,
          bitrate: 1,
          frameRate: FPS30,
          orientationMode: Adaptative,
        },
        audioProfile: AudioProfileDefault,
        audioScenario: AudioScenarioDefault,
      };
      RtcEngine.init(config); //Initialize the RTC engine
    }
  }

  componentDidMount() {
    RtcEngine.on('userJoined', data => {
      const {peerIds} = this.state; //Get currrent peer IDs
      if (peerIds.indexOf(data.uid) === -1) {
        console.log('view data', data);
        //If new user has joined
        this.setState({
          peerIds: [...peerIds, data.uid], //add peer ID to state array
        });
      }
    });
    RtcEngine.on('userOffline', data => {
      //If user leaves
      this.setState({
        peerIds: this.state.peerIds.filter(uid => uid !== data.uid), //remove peer ID from state array
      });
    });
    RtcEngine.on('joinChannelSuccess', data => {
      //If Local user joins RTC channel
      RtcEngine.startPreview(); //Start RTC preview
      this.setState({
        joinSucceed: true, //Set state variable to true
      });
    });
    RtcEngine.joinChannel(this.state.channelName, this.state.uid); //Join Channel
    RtcEngine.enableAudio(); //Enable the audio
    // this.interval = setInterval(
    //   () => this.setState(prevState => ({seconds: prevState.seconds + 1})),
    //   1000,
    // );
  }

  componentDidUpdate() {
    if (this.state.seconds > 59) {
      this.setState({seconds: 0, minutes: this.state.minutes + 1});
    }
  }

  componentWillUnmount() {
    clearInterval(this.interval);
  }

  toggleAudio = () => {
    let mute = this.state.audMute;
    console.log('Audio toggle', mute);
    RtcEngine.muteLocalAudioStream(!mute);
    this.setState({
      audMute: !mute,
    });
  };

  toggleSpeaker = () => {
    let mute = this.state.speakerMute;
    console.log('speaker toggle', mute);
    RtcEngine.setEnableSpeakerphone(!mute);
    this.setState({
      speakerMute: !mute,
    });
  };

  switchCamera = () => {
    RtcEngine.switchCamera();
  };

  toggleVideo = () => {
    let mute = this.state.vidMute;
    console.log('CallPerson toggle', mute);
    this.setState({
      vidMute: true,
    });
    RtcEngine.muteLocalVideoStream(!this.state.vidMute);
  };

  endCall(navigation) {
    RtcEngine.destroy();
    console.log('check navigation==>', navigation);
    navigation.goBack();
    console.log('lets go back now');
  }

  Video(navigation) {
    const {voiceCall, name} = this.props.route.params;
    console.log('check navigation brother', navigation);
    return (
      <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0,5)'}}>
        {this.state.peerIds.length > 1 ? ( //view for two videostreams
          <View style={{flex: 1}}>
            <AgoraView
              style={{flex: 1}}
              remoteUid={this.state.peerIds[0]}
              mode={1}
            />
            <AgoraView
              style={{flex: 1}}
              remoteUid={this.state.peerIds[1]}
              mode={1}
            />
          </View>
        ) : this.state.peerIds.length > 0 ? ( //view for videostream
          <>
            <AgoraView
              style={{flex: 1}}
              remoteUid={this.state.peerIds[0]}
              mode={1}
            />
            <View>{/* <Text>asdasd</Text> */}</View>
          </>
        ) : (
          <View />
        )}
        {!this.state.vidMute || !voiceCall ? ( //view for local video
          <AgoraView
            style={styles.localVideoStyle}
            zOrderMediaOverlay={true}
            showLocalVideo={true}
            mode={1}
          />
        ) : (
          <View
            style={{justifyContent: 'center', alignItems: 'center', flex: 1}}>
            <Image
              image={require('../../assets/sampleImages/avatar1.jpg')}
              style={{margin: 0, borderRadius: '50'}}
              height={120}
              width={120}
              borderRadius={100}
            />
            <Text
              style={{
                textAlign: 'center',
                color: 'white',
                fontSize: 25,
                fontWeight: 'bold',
                width: 300,
              }}
              numberOfLines={1}>
              {name}
            </Text>
            <Text style={styles.timer}>
              {`${
                this.state.minutes < 10
                  ? `0${this.state.minutes}`
                  : `${this.state.minutes}:`
              }:${
                this.state.seconds < 10
                  ? `0${this.state.seconds}`
                  : `${this.state.seconds}`
              }`}
            </Text>
            <View style={styles.buttonBar}>
              <TouchableOpacity onPress={() => this.endCall(navigation)}>
                <Icon
                  style={[styles.iconStyle, {backgroundColor: 'red'}]}
                  name="phone-hangup"
                  color="white"
                  size={25}
                />
              </TouchableOpacity>
              <AntIcon
                style={[styles.iconStyle, {backgroundColor: 'white'}]}
                size={25}
                color="blue"
                name="sound"
                onPress={() => this.toggleSpeaker()}
              />
              <Icon
                style={[styles.iconStyle, {backgroundColor: 'white'}]}
                size={25}
                color="blue"
                name={this.state.vidMute ? 'video-off' : 'video'}
                onPress={() => this.toggleVideo()}
              />
            </View>
          </View>
        )}
        {!this.state.vidMute ||
          (!voiceCall && (
            <View style={styles.buttonBar}>
              <TouchableOpacity onPress={() => this.endCall(navigation)}>
                <Icon
                  style={[styles.iconStyle, {backgroundColor: 'red'}]}
                  name="phone-hangup"
                  color="white"
                  size={25}
                />
              </TouchableOpacity>
              <Icon
                style={[styles.iconStyle, {backgroundColor: 'blue'}]}
                name={this.state.audMute ? 'microphone-off' : 'microphone'}
                color="white"
                size={25}
                onPress={() => this.toggleAudio()}
              />
              <Icon
                style={[styles.iconStyle, {backgroundColor: 'blue'}]}
                name="camera-party-mode"
                color="white"
                size={25}
                onPress={() => this.switchCamera()}
              />
              <Icon
                style={[styles.iconStyle, {backgroundColor: 'blue'}]}
                size={25}
                color="white"
                name={this.state.vidMute ? 'video-off' : 'video'}
                onPress={() => this.toggleVideo()}
              />
            </View>
          ))}
      </View>
    );
  }

  render() {
    const {navigation} = this.props;
    return this.Video(navigation);
  }
}

const styles = StyleSheet.create({
  buttonBar: {
    display: 'flex',
    width: '100%',
    position: 'absolute',
    bottom: 0,
    left: 0,
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignContent: 'center',
    alignItems: 'center',
  },
  localVideoStyle: {
    width: 120,
    height: 130,
    padding: 20,
    position: 'absolute',
    top: 10,
    borderRadius: 50,
    right: 10,
    zIndex: 100,
  },
  iconStyle: {
    padding: 15,
    borderRadius: 50,
    // paddingTop: 15,
    // paddingLeft: 20,
    // paddingRight: 20,
    // paddingBottom: 15,
    // borderRadius: 50,
  },
  rowFlex: {
    justifyContent: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    alignItems: 'center',
  },
  timer: {
    color: 'white',
  },
  name: {},
});

export default CallPerson;
