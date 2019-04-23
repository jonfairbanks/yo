import React, { Component } from "react";
import "./Home.css";
import { createShortUrl } from "../../APIHelper";
import config from "../../config/config";
import psl from "psl";

class Home extends Component {
  constructor() {
    super();
    this.state = {
      showShortenUrl: false,
      shortenUrl: "",
      originalUrl: "",
      baseUrl: "",
      clickSubmit: true,
      showError: false,
      apiError: "",
      showApiError: false,
      showLoading: false,
      exUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      exLinkName: "Rick",
      exShortUrl: config.baseUrl
    };
    this.handleUserInput = this.handleUserInput.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.extractHostname = this.extractHostname.bind(this);
  }

  handleUserInput(e) {
    const name = e.target.name;
    const value = e.target.value;
    this.setState({ [name]: value });
  }

  extractHostname(url) {
    var hostname;
    // Find & remove protocol (http, ftp, etc.) and get hostname
    if (url.indexOf("//") > -1) {hostname = url.split('/')[2];}
    else {hostname = url.split('/')[0];}
    // Find & remove port number
    hostname = hostname.split(':')[0];
    // Find & remove "?"
    hostname = hostname.split('?')[0];
    return hostname;
  }

  handleSubmit() {
    this.setState({ clickSubmit: true, showApiError: false });
    if (this.state.clickSubmit && this.state.originalUrl) {
      this.setState({ showLoading: true, showShortenUrl: false });

      let reqObj = {
        originalUrl: this.state.originalUrl,
        linkName: this.state.linkName,
        shortBaseUrl: config.baseUrl
      };

      if(psl.get(this.extractHostname(reqObj.originalUrl)) === psl.get(this.extractHostname(config.baseUrl))) {
        this.setState({
          showLoading: false,
          showApiError: true,
          apiError: "Redirects back to Yo are not permitted."
        })
        return;
      }

      if(this.state.linkName.length > 99) {
        this.setState({
          showLoading: false,
          showApiError: true,
          apiError: "Please pick a shorter URL."
        })
        return;
      }

      createShortUrl(reqObj)
        .then(json => {
          setTimeout(() => {
            this.setState({
              showLoading: false,
              showShortenUrl: true,
              shortenUrl: json.data.shortUrl,
              originalUrl: "",
              linkName: ""
            });
          }, 0);
        })
        .catch(error => {
          this.setState({
            showLoading: false,
            showApiError: true,
            apiError: "Server Error"
          });
        });
    } else {
      this.setState({ showError: true });
    }
  }

  renderButton() {
    if (!this.state.showLoading) {
      return (
        <button
          className="btn waves-effect waves-light submit-btn"
          name="action"
          onClick={this.handleSubmit}
        >
          Submit
        </button>
      );
    } else {
      return (
        <div className="loader">
          <div className="preloader-wrapper small active">
            <div className="spinner-layer spinner-green-only">
              <div className="circle-clipper left">
                <div className="circle" />
              </div>
              <div className="gap-patch">
                <div className="circle" />
              </div>
              <div className="circle-clipper right">
                <div className="circle" />
              </div>
            </div>
          </div>
        </div>
      );
    }
  }

  render() {
    return (
      <div className="home">
        <div>
          <h5>Original URL</h5>
        </div>
        <div>
          Ex:{" "}
          <a href={this.state.exUrl} target="_blank" rel="noopener noreferrer">
            {this.state.exUrl}
          </a>
        </div>
        <input
          name="originalUrl"
          field="originalUrl"
          placeholder="Original URL"
          value={this.state.originalUrl}
          onChange={this.handleUserInput.bind(this)}
        />

        {this.state.showError && (
          <div className="formError">A URL is required</div>
        )}

        <div>
          <h5>Link Name</h5>
        </div>
        <div>
          Ex: {this.state.exLinkName}
        </div>
        <input
          name="linkName"
          field="linkName"
          placeholder="Your Link Name"
          value={this.state.linkName}
          onChange={this.handleUserInput.bind(this)}
        />

        {this.state.showError && (
          <div className="formError">A Link Name is required</div>
        )}

        {this.renderButton()}

        {this.state.showApiError && (
          <div className="shorten-error">{this.state.apiError}</div>
        )}

        {this.state.showShortenUrl && (
          <div className="shorten-title">
            Shortened URL is ->{` `}
            <a href={this.state.shortenUrl} target="_blank" rel="noopener noreferrer">
              {this.state.shortenUrl}
            </a>
          </div>
        )}
      </div>
    );
  }
}

export default Home;
