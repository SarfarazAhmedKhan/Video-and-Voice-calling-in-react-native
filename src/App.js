import React, {useEffect} from 'react';
import {
  configureFonts,
  DefaultTheme,
  Provider as PaperProvider,
  Text,
  View,
} from 'react-native-paper';
import VideoCall from './components/VideoCalling/Video';

const fontConfig = {
  default: {
    regular: {
      fontFamily: 'Nunito-Regular',
      fontWeight: 'normal',
    },
  },
};

const theme = {
  ...DefaultTheme,
  fonts: configureFonts(fontConfig),
  colors: {
    ...DefaultTheme.colors,
    primary: '#0000ff',
    accent: '#f7f7f7',
    background: '#fff',
    text: '#6A6A6A',
  },
};

export default function Main() {
  return (
    <View>
      <VideoCall />
    </View>
  );
}
