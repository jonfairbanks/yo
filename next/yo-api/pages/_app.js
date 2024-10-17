import { useEffect } from 'react';

import '../node_modules/@materializecss/materialize/dist/css/materialize.min.css'; // Import Materialize CSS
import '../node_modules/@materializecss/materialize/dist/js/materialize.min.js'; // Import Materialize JS

function MyApp({ Component, pageProps }) {
  useEffect(() => {
    // Initialize Materialize JavaScript components
    if (typeof window !== 'undefined') {
      const M = require('@materializecss/materialize');
      M.AutoInit();
    }
  }, []);

  return <Component {...pageProps} />;
}

export default MyApp;