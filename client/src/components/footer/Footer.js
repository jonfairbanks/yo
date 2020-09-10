import React from 'react';

const Footer = () => (
  <div className="footer grey-text text-darken-4">
    <div style={{
      backgroundColor: '#424242', paddingBottom: '15px', paddingTop: '15px', border: '1px solid #404040'
    }}
    >
      <a target="_blank" href="https://fbnks.io/yo" rel="noopener noreferrer" className="grey-text text-darken-2">
        Fairbanks.io ©
        {' '}
        {new Date().getFullYear()}
      </a>
    </div>
  </div>
);

export default Footer;
