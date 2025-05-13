import 'react-native-gesture-handler';
import { enableScreens } from 'react-native-screens';
enableScreens(); // This must be called before any navigation renders

import { registerRootComponent } from 'expo';
import App from './RealAuthIntegratedApp';

registerRootComponent(App);
