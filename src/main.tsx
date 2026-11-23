import '@fontsource-variable/inter';
import '@fontsource-variable/space-grotesk';
import { render } from 'preact';
import { App } from './ui/App';
import { applyTheme, loadTheme } from './ui/theme';
import './ui/styles.css';

applyTheme(loadTheme());
render(<App />, document.getElementById('app')!);
