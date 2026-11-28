import '@fontsource-variable/dm-sans';
import '@fontsource-variable/quicksand';
import '@fontsource-variable/merriweather';
import '@fontsource/courier-prime/400.css';
import '@fontsource/courier-prime/700.css';
import '@fontsource/kalam/400.css';
import '@fontsource/kalam/700.css';
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
