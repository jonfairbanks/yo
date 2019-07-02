import React from 'react';
import { Link } from 'react-router-dom';
import './Header.css';

const Header = () => (
  <nav className="z-depth-0">
    <div className="nav-wrapper grey darken-3">
      <Link
        to="/"
        className="left brand-logo"
        style={{ left: '0px', color: 'black' }}
      >
        <div>
          <span className="grey-text text-darken-2">Yo - The URL Shortener  </span>
          <img src="https://i.imgur.com/r8aUQau.png" height="32" width="32" alt="yo-logo" />
        </div>
      </Link>
    </div>
  </nav>
);

export default Header;
