import '@fontsource-variable/inter';
import '@fontsource-variable/lora';
import '@fontsource-variable/nunito';
import '@fontsource-variable/jetbrains-mono';
import '@fontsource-variable/caveat';
import { render } from 'preact';
import { App } from './ui/App';
import { initNative } from './native';
import { applyFontFace, applyLook, applyTextSize, loadFontFace, loadFontPx, loadMode, loadPalette } from './ui/appearance';
import './ui/styles.css';

applyLook(loadPalette(), loadMode());
applyFontFace(loadFontFace());
applyTextSize(loadFontPx());
render(<App />, document.getElementById('app')!);
initNative();
