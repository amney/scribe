/* global chrome */
import React from 'react'
import ReactDOM from 'react-dom'


class Options extends React.Component {
  constructor() {
    super()
    this.state = {
      domain: "",
      credentials: { key: "", secret: "" }
    }
  }

  componentDidMount() {
    chrome.tabs.getSelected(null, (tab) => {
      var url = new URL(tab.url)
      var domain = url.hostname
      console.log(domain)

      chrome.storage.local.get([domain], (result) => {
        console.log("Found existing credentials:", result)
        var credentials = result[domain] || { key: "", secret: "" }
        console.log(credentials)
        this.setState({ domain, credentials })
      })
    })
  }

  inject() {
    chrome.tabs.query({
      active: true,
      currentWindow: true,
    }, (tabs) => {
      // Send message to script file
      chrome.tabs.sendMessage(
        tabs[0].id,
        { injectApp: true },
        () => window.close()
      )
    })
  }

  render() {
    return (
      <div>
        <Credentials
          credentials={this.state.credentials}
          syncKey={this.syncKey.bind(this)}
          syncSecret={this.syncSecret.bind(this)}
          clear={this.clear.bind(this)}
          domain={this.state.domain} />
        <button className="edit" onClick={this.inject}>
          Edit Annotations
        </button>
      </div>
    )
  }

  syncKey(key) {
    let { domain, credentials } = this.state
    credentials.key = key
    console.log("saving key", key)

    this.setState({ credentials })
    chrome.storage.local.set({ [domain]: { key: credentials.key, secret: credentials.secret } })
  }
  syncSecret(secret) {
    let { domain, credentials } = this.state
    credentials.secret = secret
    console.log("saving secret (obscured)")
    
    this.setState({ credentials })
    chrome.storage.local.set({ [domain]: { key: credentials.key, secret: credentials.secret } })
  }

  clear() {
    this.syncKey("")
    this.syncSecret("")
  }
}



class Credentials extends React.Component {
  constructor() {
    super()
  }

  syncKey(e) {
    let key = e.target.value
    this.props.syncKey(key)
  }
  syncSecret(e) {
    let secret = e.target.value
    this.props.syncSecret(secret)
  }

  render() {
    return (
      <div className="credentials" >
        <h4>API credentials for {this.props.domain}</h4>
        <input className="creds" type="text" placeholder="API key" value={this.props.credentials.key} onChange={this.syncKey.bind(this)} spellCheck="false" />
        <input className="creds" type="text" placeholder="API secret" value={this.props.credentials.secret} onChange={this.syncSecret.bind(this)} spellCheck="false" />
        <button className="save" onClick={this.props.clear}>
          Clear
        </button>
      </div>
    )
  }
}


ReactDOM.render(<Options />, document.querySelector("#container"))
