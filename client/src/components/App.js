import React, { Component } from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";

import Header from "./header/Headers";
import Landing from "./landing/Landing";
import "./styles.css";
class App extends Component {
  componentDidMount() {}

  render() {
    return (
      <div className="container">
        <BrowserRouter>
          <div>
            <Header />
            <Switch>
              <Route path="/" component={Landing} />
            </Switch>
          </div>
        </BrowserRouter>
        <div className="footer">
          <a target="_blank" href="https://fairbanks.io" rel="noopener noreferrer">
            Fairbanks.io
          </a> © 2019
        </div>
      </div>
    );
  }
}

export default App;
