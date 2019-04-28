import React, { Component } from "react";
import { BrowserRouter, Route, Switch } from "react-router-dom";

import Header from "./header/Headers";
import Home from "./home/Home";
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
              <Route path="/" component={Home} />
            </Switch>
          </div>
        </BrowserRouter>
        <div className="footer grey-text text-darken-4">
          <div style={{paddingBottom: "15px", paddingTop: "15px"}}>
            <a target="_blank" href="https://fairbanks.io/beta" rel="noopener noreferrer" className="grey-text text-darken-2">
              Fairbanks.io © {new Date().getFullYear()}
            </a>
          </div>
        </div>
      </div>
    );
  }
}

export default App;
