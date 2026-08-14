// Must stay first: it defines engine globals that React Native's own startup
// reads, so it has to run before anything pulls in `react-native`.
import "./polyfills";

import { registerRootComponent } from "expo";
import App from "./src/App";

registerRootComponent(App);
