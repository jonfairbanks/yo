import 'materialize-css/dist/css/materialize.min.css';
import React from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import App from './components/App';

window.axios = axios; // eslint-disable-line no-undef

ReactDOM.render(<App />, document.querySelector('#root')); // eslint-disable-line no-undef
