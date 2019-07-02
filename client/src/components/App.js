import React from 'react';
import { BrowserRouter, Route, Switch } from 'react-router-dom';

import Header from './header/Header';
import Home from './home/Home';
import Footer from './footer/Footer';

import './styles.css';

const App = () => (
  <div className="container">
    <BrowserRouter>
      <div>
        <Header />
        <Switch>
          <Route path="/" component={Home} />
        </Switch>
        <Footer />
      </div>
    </BrowserRouter>
  </div>
);

export default App;
