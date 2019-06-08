import React, { Component } from "react";
import "./Home.css";
import { createShortUrl } from "../../APIHelper";
import config from "../../config/config";
import Filter from 'bad-words';
import moment from 'moment';
import io from 'socket.io-client';
import {CopyToClipboard} from 'react-copy-to-clipboard';

const socket = io(config.socketUrl);

var filter = new Filter();
filter.addWords(...config.blockedNames); 
filter.removeWords(...config.allowedNames);

class Home extends Component {
  constructor() {
    super();
    this.state = {
      showShortenUrl: false,
      shortenUrl: "",
      originalUrl: "",
      baseUrl: "",
      linkName: "",
      apiUrl: config.apiUrl,
      clickSubmit: true,
      showError: false,
      apiError: "",
      showApiError: false,
      showLoading: false,
      exUrl: config.urlPlaceholder,
      exLinkName: config.namePlaceholder,
      allYos: "",
      popYos: "",
      liveYos: "",
      copied: ""
    };
    this.handleUserInput = this.handleUserInput.bind(this);
    this.handleSubmit = this.handleSubmit.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.extractHostname = this.extractHostname.bind(this);
    this.checkHostname = this.checkHostname.bind(this);
    this.getAllYos = this.getAllYos.bind(this);
    this.getPopularYos = this.getPopularYos.bind(this);
    this.getLiveYos = this.getLiveYos.bind(this);
    this.hideErrorDiags = this.hideErrorDiags.bind(this);
    this.handleCopy = this.handleCopy.bind(this);
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

  checkHostname(bUrl, oUrl) {
    var baseUrl = this.extractHostname(bUrl).replace(/\\(.)/mg, "$1");
    var originalUrl = this.extractHostname(oUrl).replace(/\\(.)/mg, "$1");
    if(baseUrl === originalUrl) { return true }else { return false }
  }

  hideErrorDiags() {
    setTimeout(() => {
      this.setState({
        showApiError: false,
        showError: false
      });
    }, 5000);
  }

  handleSubmit() {
    this.setState({ clickSubmit: true, showApiError: false });
    if (this.state.clickSubmit && this.state.originalUrl) {
      this.setState({ showLoading: true, showShortenUrl: false });

      let reqObj = {
        originalUrl: this.state.originalUrl,
        linkName: this.state.linkName.toLowerCase(),
        shortBaseUrl: config.baseUrl
      };

      // Ensure that links are not pointing back to Yo, essentially creating a loop.
      if(this.checkHostname(config.baseUrl, reqObj.originalUrl)) {
        this.setState({
          showLoading: false,
          showApiError: true,
          apiError: "Redirects back to Yo are not permitted."
        })
        this.hideErrorDiags();
        return;
      }

      // Ensure linkName's aren't too long
      if(this.state.linkName.length > 99) {
        this.setState({
          showLoading: false,
          showApiError: true,
          apiError: "Please pick a shorter link name."
        })
        this.hideErrorDiags();
        return;
      }

      // Profanity filter for linkName's
      if(filter.isProfane(reqObj.linkName)) {
        this.setState({
          showLoading: false,
          showApiError: true,
          apiError: "This link name is not supported.",
          originalUrl: "",
          linkName: ""
        })
        this.hideErrorDiags();
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
            apiError: error.response.data
          });
          this.hideErrorDiags();
        });
    } else {
      this.setState({ showError: true });
      this.hideErrorDiags();
    }
  }

  handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      this.handleSubmit();
    }
  }

  handleCopy(yo) {
    return (
      this.state.copied !== yo._id
      ? <CopyToClipboard 
          text={yo.originalUrl} 
          onCopy={() => {
            this.setState({ copied: yo._id })
            setTimeout(() => {
              this.setState({ copied: "" })
            }, 3000)
          }}
        >
          <li><i style={{ "cursor":"pointer", "paddingRight":"7px" }} className="small material-icons">content_copy</i></li>
        </CopyToClipboard>
      : <li><i style={{ "cursor":"none", "paddingRight":"7px" }} className="small teal-text material-icons">check</i></li>
    )
  }

  renderButton() {
    if (!this.state.showLoading) {
      return (
        <button
          className="btn waves-effect waves-light submit-btn grey-text text-darken-4"
          name="action"
          onClick={this.handleSubmit}
        >
          Create Yo Link
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

  getAllYos() {
    fetch(this.state.apiUrl)
    .then(res => res.json())
    .then(out => { this.setState({allYos: out}) })
  }

  getPopularYos() {
    fetch(this.state.apiUrl + 'popular')
    .then(res => res.json())
    .then(out => { this.setState({popYos: out}) })
  }

  getLiveYos() {
    fetch(this.state.apiUrl + 'recent')
    .then(res => res.json())
    .then(out => { this.setState({liveYos: out}) })
  }

  componentDidMount() {
    this.getAllYos();
    this.getPopularYos();
    this.getLiveYos();

    // Poll for all Yo's
      socket.on("allYos", (out) => { this.setState({ allYos: out }) });

    // Poll for popular Yo's
      socket.on("popYos", (out) => { this.setState({ popYos: out }) });
    
    // Poll for recent Yo's
      socket.on("liveYos", (out) => { this.setState({ liveYos: out }) });
  }

  render() {
    return (
      <div>
        <ul id="tabs-swipe-demo" className="tabs grey darken-3">
          <li className="tab col s3"><a className="active teal-text" href="#create">Create</a></li>
          <li className="tab col s3"><a className="teal-text" href="#popular">Popular</a></li>
          <li className="tab col s3"><a className="teal-text" href="#live">Live</a></li>
          <li className="tab col s3"><a className="teal-text" href="#all">All</a></li>
        </ul>
        <div id="create" className="col s12 teal-text">
          {/* TAB 1 */}
          <div>
            <div>
              <h5 className="grey-text text-darken-2">Original URL</h5>
            </div>
            <input
              name="originalUrl"
              field="originalUrl"
              placeholder={this.state.exUrl}
              value={this.state.originalUrl}
              onChange={this.handleUserInput.bind(this)}
            />

            {this.state.showError && (
              <div className="formError red-text text-darken-4">A URL is required</div>
            )}

            <br/><br/>
            
            <div>
              <h5 className="grey-text text-darken-2">Link Name</h5>
            </div>
            <input
              data-length="99"
              name="linkName"
              field="linkName"
              placeholder={this.state.exLinkName}
              value={this.state.linkName}
              onChange={this.handleUserInput.bind(this)}
              onKeyDown={this.handleKeyDown}
            />

            {this.state.showError && (
              <div className="formError red-text text-darken-4">A Link Name is required</div>
            )}

            <br/><br/>

            {this.renderButton()}

            {this.state.showApiError && (
              <div className="shorten-error red-text text-darken-4">{this.state.apiError}</div>
            )}

            {this.state.showShortenUrl && (
              <div className="shorten-title grey-text text-darken-1">
                Shortened URL is  🡆  {` `}
                <a href={this.state.shortenUrl} target="_blank" rel="noopener noreferrer">
                  {this.state.shortenUrl}
                </a>
              </div>
            )}
          </div>
        </div>
        <div id="popular" className="col s12 grey-text">
          {/* TAB 2 */}
          <div>
            <table>
              <thead>
                <tr>
                  <th>Link Name</th>
                  <th>Site URL</th>
                  <th>URL Hits</th>
                </tr>
              </thead>
              <tbody>
              {
                this.state.popYos.length > 0 
                ? this.state.popYos.map((yo, key) => {
                  return (
                    <tr key={key}>
                      <td width="15%"><pre onClick={() => window.open(yo.shortUrl, '_blank')} style={{cursor: "pointer"}}>{yo.linkName}</pre></td>
                      <td width="75%"><a className="grey-text text-darken-2" href={yo.shortUrl} target="_blank" rel="noopener noreferrer">{yo.originalUrl}</a></td>
                      <td width="10%">{yo.urlHits}</td>
                    </tr>
                  )
                }, this)
                : null
              }
              </tbody>
            </table>
          </div>
        </div>
        <div id="live" className="col s12 grey-text">
          {/* TAB 3 */}
          <div>
            <table>
              <thead>
                <tr>
                  <th>Link Name</th>
                  <th>Site URL</th>
                  <th>Last Access</th>
                </tr>
              </thead>
              <tbody>
              {
                this.state.liveYos.length > 0 
                ? this.state.liveYos.map((yo, key) => {
                  var timeElapsed = moment(yo.lastAccess).from(moment().add(1, "s"));
                  return (
                    <tr key={key}>
                      <td width="15%" onClick={() => window.open(yo.shortUrl, '_blank')} style={{cursor: "pointer"}}><pre>{yo.linkName}</pre></td>
                      <td width="75%"><a className="grey-text text-darken-2" href={yo.shortUrl} target="_blank" rel="noopener noreferrer">{yo.originalUrl}</a></td>
                      <td width="10%">{timeElapsed}</td>
                    </tr>
                  )
                }, this)
                : null
              }
              </tbody>
            </table>
          </div>
        </div>
        <div id="all" className="col s12 grey-text">
          {/* TAB 4 */}
          <div>
            <table>
              <thead>
                <tr>
                  <th>Link Name</th>
                  <th>Site URL</th>
                  <th>URL Hits</th>
                  <th>Options</th>
                </tr>
              </thead>
              <tbody>
              {
                this.state.allYos.length > 0 
                ? this.state.allYos.map((yo, key) => {
                  return (
                    <tr key={key}>
                      <td width="15%" onClick={() => window.open(yo.shortUrl, '_blank')} style={{cursor: "pointer"}}><pre>{yo.linkName}</pre></td>
                      <td width="75%"><a className="grey-text text-darken-2" href={yo.shortUrl} target="_blank" rel="noopener noreferrer">{yo.originalUrl}</a></td>
                      <td width="10%">{ !yo.urlHits ? "-" : yo.urlHits}</td>
                      <td>
                        <ul style={{"display":"flex"}}>
                          {this.handleCopy(yo)}
                          <li><i style={{ "cursor":"not-allowed", "paddingRight":"7px" }} className="small material-icons">edit</i></li>
                        </ul>
                      </td>
                    </tr>
                  )
                }, this)
                : null
              }
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }
}

export default Home;
