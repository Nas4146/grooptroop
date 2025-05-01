import React from 'react';
import * as ReactNativeCSSInterop from 'react-native-css-interop';
import '../../styles/commonStyles.css';

// Empty stylesheet to trigger CSS interop
//StyleSheet.create({});


export default function WithStylesheet({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
  }