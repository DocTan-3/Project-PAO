import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import '@fontsource-variable/lora';
import '@fontsource-variable/nunito';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/caveat';
import { render } from 'preact';
import { App } from './ui/App';
import { initNative } from './native';
import { applyFontFace, applyTheme, loadFontFace, loadTheme } from './ui/appearance';
import './ui/styles.css';

applyTheme(loadTheme());
applyFontFace(loadFontFace());
render(<App />, document.getElementById('app')!);
initNative();
