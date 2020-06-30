import React, {Fragment, useEffect, useState, useRef} from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  FlatList,
  ScrollView,
  Keyboard,
} from 'react-native';
import ChatHeader from '../components/doctor/chatPerson/ChatHeader';
import {IconButton} from 'react-native-paper';
import {useSelector, useDispatch} from 'react-redux';
import MsgItem from '../components/doctor/chatPerson/MsgItem';
import {socket} from '../store/common/apiCreator';
import axios from 'axios';
import moment from 'moment';
import Spinner from 'react-native-loading-spinner-overlay';
import {chatAction} from '../store/actions';
import {serverURL} from '../store/common/apiCreator';
import {useNavigation} from '@react-navigation/native';
import DocumentPicker from 'react-native-document-picker';
import RequestCameraAndAudioPermission from '../components/VideoCalling/Permission';
import {AudioRecorder, AudioUtils} from 'react-native-audio';
let audioPath = AudioUtils.DocumentDirectoryPath + '/test.aac';
import {RtcEngine, AgoraView} from 'react-native-agora';
import {TouchableOpacity} from 'react-native-gesture-handler';
import ClockTimer from '../components/ClockTimer';
import ImageViewBackground from '../components/ImageViewBackground';
import Icon from 'react-native-vector-icons/MaterialIcons';
import Sound from 'react-native-sound';
const RNFS = require('react-native-fs');

const ChatPerson = ({route}) => {
  let {doctorId, patientId, name, data, user} = route.params;
  const dispatch = useDispatch();
  const [txt, setTxt] = useState('');
  const [chatId, setChatId] = useState('');
  const [loading, setLoading] = useState(false);
  const [clockTimer, setClockTimer] = useState(false);
  const [timeStop, setTimeStop] = useState(false);
  const [cameraImg, setCameraImg] = useState({
    uri: '',
    based64: '',
  });
  const [message, setMessageList] = useState([]);
  const [state, setState] = useState({
    audioPath: `${AudioUtils.DocumentDirectoryPath}/test.aac`,
    audioSettings: {
      SampleRate: 22050,
      Channels: 1,
      AudioQuality: 'Low',
      AudioEncoding: 'aac',
      MeteringEnabled: true,
      IncludeBase64: true,
      AudioEncodingBitRate: 32000,
    },
    audioUrl: false,
  });
  const [recordMsg, setRecordMsg] = useState({
    duration: '',
    recording: '',
  });
  const token = useSelector(state => state.auth.token);
  const connectionId = useSelector(state => state.auth.socketId);
  let date = moment(data.date.day).format('MMMM DD, YYYY');

  const scrollViewRef = useRef();
  const clockTimerRef = useRef();
  const navigation = useNavigation();

  useEffect(() => {
    console.log('use effect runs');
    Connect();
    socket.on('receiveServerMsg', (msg, type, recording_duration, userType) => {
      console.log('user type', userType);
      let _time = new Date();
      let time = moment(_time).format('hh:mm A');
      let userId = patientId;
      if (userType == 'Doctor') {
        userId = doctorId;
      }
      let message = {
        user: userId,
        msg: msg,
        time: time,
        category: type,
        duartion: recording_duration,
      };
      if (type == 'img') {
        message.img = msg;
        delete message.msg;
      }
      console.log('view here msges now brother hood==>', message);
      setMessageList(currentmsg => [...currentmsg, message]);
    });
    PermissionAndroid();
  }, []);

  const PermissionAndroid = async () => {
    let get = await RequestCameraAndAudioPermission();
    console.log('view get', get);
    if (get == true) {
      await AudioRecorder.prepareRecordingAtPath(
        state.audioPath,
        state.audioSettings,
      );
      AudioRecorder.onProgress = data => {
        console.log(data, 'onProgress data');
      };
      AudioRecorder.onFinished = data => {
        setRecordMsg(prevState => ({
          ...prevState,
          ['recording']: data.base64,
        }));
        console.log('view data on fininsh here right', data);
      };
    }
  };

  const Connect = async () => {
    try {
      setLoading(true);
      const getChats = await axios.post(`${serverURL}/chat/get`, {
        doctorId,
        patientId,
      });
      if (getChats.data.result != null) {
        setChatId(getChats.data.result._id);
        setMessageList(getChats.data.result.messages);
        socket.emit('JoinRoom', getChats.data.result._id);
      }
      setLoading(false);
    } catch (error) {
      setLoading(false);
      console.log('view error herase', error);
    }
  };

  const sendMsgToRoom = async () => {
    try {
      setTxt('');
      const addChat = await AddChat(chatId, txt, 'text', recordMsg.duration);
    } catch (error) {
      console.log('view error end msg toorm', error);
    }
  };

  const CameraImage = async uri => {
    try {
      console.log('view image uri', uri);
      let imageurl = await RNFS.readFile(uri, 'base64');
      const imgUrl = await dispatch(chatAction.getCloudinaryImgUrl([imageurl]));
      console.log('view img url here now', imgUrl);
      const addChat = await AddChat(chatId, imgUrl, 'img', recordMsg.duration);
    } catch (error) {
      console.log('error', error);
      setLoading(false);
    }
  };

  const sendVoiceMsgToRoom = async () => {
    try {
      const recordingUrl = await dispatch(
        chatAction.getCloudinaryRecordingUrl(recordMsg),
      );
      const addChat = await AddChat(
        chatId,
        recordingUrl,
        'audio',
        recordMsg.duration,
      );
      setState(prevState => ({
        ...prevState,
        ['audioUrl']: false,
      }));
      setClockTimer(false);
      setTimeStop(false);
    } catch (error) {
      setLoading(false);
      console.log('view error send msg to voice', error);
    }
  };

  const sendImgMsgToRoom = async detail => {
    try {
      console.log('pckg called now view detail here now', detail);
      let imageUri = [];
      for (var key in detail) {
        let basedUrl = await RNFS.readFile(detail[key].uri, 'base64');
        imageUri.push(basedUrl);
      }
      console.log('img url', imageUri);
      const imgUrl = await dispatch(chatAction.getCloudinaryImgUrl(imageUri));
      console.log('cloudinary url img', imgUrl);
      let addChat = await AddChat(chatId, imgUrl, 'img', recordMsg.duration);
      navigation.navigate('ChatPerson');
    } catch (error) {
      setLoading(false);
      console.log('view error send msg to voice', error);
    }
  };

  const AddChat = async (chatId, msg, type, duration) => {
    try {
      socket.emit('SendMsgToRoom', chatId, msg, type, duration, user);
      let _time = new Date();
      let time = moment(_time).format('hh:mm A');
      let userId = patientId;
      if (user == 'Doctor') {
        userId = doctorId;
      }
      let chat = {
        doctor: doctorId,
        patient: patientId,
        messages: {
          category: type,
          user: userId,
          msg: msg,
          duration: duration,
          time: time,
          date: moment(Date.now()).format('YYYY-MM-DD'),
        },
      };

      if (type == 'img') {
        (chat.messages.img = msg), delete chat.messages.msg;
      }
      console.log('check chat', chat);
      const addChat = await dispatch(chatAction.addChat(chat));
      return addChat;
    } catch (error) {
      console.log('view and check out error now', error);
    }
  };

  const _onChange = e => {
    setTxt(e);
  };

  const filePicker = async () => {
    try {
      const res = await DocumentPicker.pickMultiple({
        type: [DocumentPicker.types.images],
        readContent: true,
      });
      console.log('view here image', res);
      let jpeg = [];

      for (var key in res) {
        jpeg.push(res[key].uri);
      }
      navigation.navigate('File', {
        pdf: [],
        jpg: jpeg,
        format: 'attachment',
        index: 0,
        file: res,
        SendImg: sendImgMsgToRoom,
      });
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
      } else {
        throw err;
      }
    }
  };

  const voiceCall = () => {
    navigation.navigate('CallPerson', {
      name: name,
      data: data,
      user: 'Patient',
      voiceCall: true,
    });
    console.log('voice call');
  };

  const videoCall = () => {
    navigation.navigate('CallPerson', {
      name: name,
      data: data,
      user: 'Patient',
      voiceCall: false,
    });
    console.log('video Call');
  };

  const recordDuration = duration => {
    console.log('check duration now', duration);
    setRecordMsg(prevState => ({
      ...prevState,
      ['duration']: duration,
    }));
  };

  const stopAudio = async () => {
    clockTimerRef.current.stopClock();
    setTimeStop(true);
    await AudioRecorder.stopRecording();
    const {audioPath} = state;
    console.log('audio path', audioPath, state);
    setState(prevState => ({
      ...prevState,
      ['audioUrl']: audioPath,
    }));
  };

  const cancelAudio = async () => {
    console.log('clock timer false');
    setClockTimer(false);
    setTimeStop(false);
    setRecordMsg({duration: '', recording: ''});
    setState(prevState => ({
      ...prevState,
      ['audioUrl']: false,
    }));
  };

  const handleAudio = async check => {
    setClockTimer(true);
    console.log('starts audio now', state);
    await AudioRecorder.prepareRecordingAtPath(
      state.audioPath,
      state.audioSettings,
    );
    await AudioRecorder.startRecording();
    console.log('stops audio now', state);
  };

  const Option = Case => {
    switch (Case) {
      case 2:
        return (
          <>
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
              {timeStop && (
                <IconButton
                  color="grey"
                  icon="play"
                  onPress={() => {
                    const sound = new Sound(state.audioUrl, '', error => {
                      if (error) {
                        console.log('failed to load the sound', error);
                      }
                      sound.getCurrentTime(minutes =>
                        console.log('at ' + minutes),
                      );
                      sound.play(success => {
                        console.log(success, 'success play');
                        if (!success) {
                          console.log('failed audio');
                          // Alert.alert('There was an error playing this audio');
                        }
                      });
                    });
                  }}
                />
              )}
              <IconButton color="red" icon="microphone" />
              <ClockTimer ref={clockTimerRef} recordDuration={recordDuration} />
            </View>
            <TouchableOpacity onPress={cancelAudio} style={{right: 5}}>
              <Text style={[styles.txtInputStyle, {color: 'red'}]}>Cancel</Text>
            </TouchableOpacity>
          </>
        );
      case 3:
        return (
          <View
            style={{
              flexDirection: 'row',
              flex: 1,
              alignItems: 'center',
              justifyContent: 'space-between',
            }}>
            <TextInput
              placeholder="Type a message"
              style={styles.txtInputStyle}
              value={txt}
              onChangeText={e => _onChange(e)}
              multiline
            />
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
              }}>
              <IconButton
                icon="attachment"
                onPress={filePicker}
                style={styles.iconStyle}
              />
              <TouchableOpacity>
                <IconButton
                  icon="camera"
                  onPress={() =>
                    navigation.navigate('Camera', {image: CameraImage})
                  }
                />
              </TouchableOpacity>
            </View>
          </View>
        );
    }
  };

  return (
    <Fragment>
      <ChatHeader name={name} voiceCall={voiceCall} videoCall={videoCall} />
      <Spinner visible={loading} />
      <ScrollView
        ref={scrollViewRef}
        onContentSizeChange={() =>
          scrollViewRef.current.scrollToEnd({animated: true})
        }
        style={styles.mainMsgContainerStyle}
        contentContainerStyle={styles.msgContentContainerStyle}>
        <View style={{alignItems: 'center'}}>
          <View style={styles.cardStyle}>
            <View style={{flex: 1}}>
              <Text style={styles.title}>Appointment Date</Text>
              <Text style={styles.secondaryText}>{date}</Text>
              <Text style={styles.title}>Appointment Time</Text>
              <Text style={styles.secondaryText}>{data.date.time}</Text>
              <Text style={styles.title}>Symptoms</Text>
              <Text style={styles.secondaryText}>
                {data.details.description}
              </Text>
            </View>
          </View>
        </View>
        <FlatList
          numColumns={1}
          data={message}
          // renderItem={(item, index) => {
          //   let date = moment(item.date).format('MMMM DD, YYYY');
          //   return (
          //     <View>
          //       <Text>{date}</Text>
          //     </View>
          //   );
          // }}
          renderItem={({item, index}) => {
            let date = moment(item.date).format('MMMM DD, YYYY');
            let check = false;
            if (index < message.length - 1) {
              check = message[index].date == message[index + 1].date;
            }
            return (
              <>
                {check && (
                  <View style={styles.dateCard}>
                    <Text>Today</Text>
                  </View>
                )}
                <MsgItem
                  receive={
                    user == 'Doctor'
                      ? item.user != doctorId
                      : user == 'Patient' && item.user !== patientId
                  }
                  time={item.time}
                  message={item}
                />
              </>
            );
          }}
          keyExtractor={(item, index) => index.toString()}
        />
      </ScrollView>
      <View style={styles.mainViewStyle}>
        <View style={styles.msgViewStyle}>
          <View
            style={{
              paddingHorizontal: 5,
              flexDirection: 'row',
              justifyContent: 'space-between',
              flex: 1,
              alignItems: 'center',
            }}>
            {clockTimer ? Option(2) : Option(3)}
          </View>
        </View>
        <View style={styles.micViewStyle}>
          {txt.length == 0 && !timeStop && cameraImg.uri == '' ? (
            <TouchableOpacity
              onLongPress={() => handleAudio(true)}
              onPressOut={_ => stopAudio()}>
              <IconButton color="white" icon="microphone" />
            </TouchableOpacity>
          ) : (
            <IconButton
              color="white"
              onPress={state.audioUrl ? sendVoiceMsgToRoom : sendMsgToRoom}
              icon="send"
            />
          )}
        </View>
      </View>
    </Fragment>
  );
};

export default ChatPerson;

const styles = StyleSheet.create({
  cardStyle: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
    width: '50%',
    alignItems: 'center',
    elevation: 2,
    borderRadius: 5,
    marginBottom: 5,
  },
  dateCard: {
    backgroundColor: 'white',
    // flexDirection: 'row',
    justifyContent: 'center',
    padding: 10,
    // width: '50%',
    alignItems: 'center',
    alignSelf: 'center',
    elevation: 2,
    borderRadius: 5,
    marginBottom: 5,
  },
  mainMsgContainerStyle: {
    flexGrow: 1,
  },
  title: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#6a6a6a',
  },
  msgContentContainerStyle: {
    // alignItems: 'center',
    padding: 15,
  },
  secondaryText: {
    marginBottom: 5,
    color: '#6a6a6a',
    fontSize: 10,
    fontFamily: 'Nunito-SemiBold',
  },
  mainViewStyle: {
    display: 'flex',
    flexDirection: 'row',
    marginHorizontal: 5,
    marginVertical: 10,
    justifyContent: 'space-between',
  },
  msgViewStyle: {
    flexDirection: 'row',
    flex: 1,
    backgroundColor: 'white',
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginRight: 5,
  },
  txtInputStyle: {
    fontSize: 15,
    left: 5,
  },
  micViewStyle: {
    backgroundColor: 'blue',
    borderRadius: 25,
    justifyContent: 'center',
  },
  iconStyle: {
    // marginRight: 0,
    // alignSelf:'center'
    marginHorizontal: 0,
  },
  rowFlex: {
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
});
