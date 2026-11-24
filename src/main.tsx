import '@fontsource-variable/inter';
import '@fontsource-variable/lora';
import '@fontsource-variable/nunito';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/caveat';
import { render } from 'preact';
import { App } from './ui/App';
import { initNative } from './native';
import { applyFontFace, applyLook, loadFontFace, loadMode, loadPalette } from './ui/appearance';
import './ui/styles.css';

applyLook(loadPalette(), loadMode());
applyFontFace(loadFontFace());
render(<App />, document.getElementById('app')!);
initNative();
