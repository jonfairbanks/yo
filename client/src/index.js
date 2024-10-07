import 'materialize-css/dist/css/materialize.min.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import axios from 'axios';
import App from './components/App';

window.axios = axios; // eslint-disable-line no-undef

const container = document.getElementById('root');
const root = createRoot(container);

root.render(<App tab="home" />);
