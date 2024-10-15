/* eslint-disable react/function-component-definition */
import React from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import Header from './header/Header';
import Home from './home/Home';
import Footer from './footer/Footer';
import RedirectToApi from './redirect/redirect';

import './styles.css';

const App = () => (
  <div className="container">
    <BrowserRouter>
      <div>
        <Header />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="*" element={<RedirectToApi />} />
        </Routes>
        <Footer />
      </div>
    </BrowserRouter>
  </div>
);

export default App;
