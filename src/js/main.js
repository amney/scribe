/* global chrome */
import React from 'react'
import ReactDOM from 'react-dom'
import RestClient from './tetration'


class Cell extends React.Component {
  constructor() {
    super()
    this.state = {
      editing: false,
      pending: false,
      pendingValue: null,
      error: false,
      errorValue: null,
      committed: false,
    }
    this.textInput = React.createRef()
    this.successTimeout = null
  }

  save(e) {
    e.preventDefault()
    let { address, vrf, header } = this.props
    let value = this.textInput.current.value
    let body = { ip: address, attributes: { [header]: value } }
    let endpoint = `/inventory/tags/${vrf}`
    let domain = window.location.host

    chrome.storage.local.get([domain], (result) => {
      const credentials = result[domain] || { key: "", secret: "" }
      const rc = new RestClient("https://" + domain, credentials.key, credentials.secret)

      clearTimeout(this.successTimeout)
      this.setState({ committed: false })
      rc.post(
        endpoint,
        (error, response) => {
          if (error) {
            this.setState({ editing: false, error: true, pending: false, errorValue: "a connection error occured" })
            console.log(error)
          }
          switch (response.statusCode) {
            case 200:
              this.setState({ editing: false, error: false, pending: true, pendingValue: value })
              this.successTimeout = setTimeout(() => this.setState({ pending: false, committed: true }), 300000)
              break
            case 401:
              this.setState({ editing: false, error: true, pending: false, errorValue: `API credentials failure - ${response.body}` })
              break
            case 403:
              this.setState({ editing: false, error: true, pending: false, errorValue: `API credentials failure - ${response.body}` })
              break
            default:
              this.setState({ editing: false, error: true, pending: false, errorValue: response.body })
          }
        }, {
          json_body: body
        }
      )
    })
  }
  render() {
    let annotation = this.props.annotation.trim()

    return this.state.editing ?
      <div>
        <form onSubmit={this.save.bind(this)}>
          <input className="form-control" ref={this.textInput} type="text" defaultValue={annotation == "None" ? "" : annotation} style={{ width: "60%", paddingRight: 5, display: 'inline-block' }} />
          <input type="submit" value="Save" className="btn btn-primary" style={{ float: 'right' }} />
          <button className="btn btn-default" onClick={() => this.setState({ editing: !this.state.editing })} style={{ float: 'right', marginRight: 5 }}>Cancel</button>
        </form>
      </div> :
      <div>
        {this.state.committed && <span title="Saved">✅ {this.state.pendingValue}</span>}
        {this.state.error && <span title={"Could not save because: " + this.state.errorValue.toLowerCase()}>🚨 {annotation}</span>}
        {this.state.pending && <span title="Saved - pending back end confirmation..">⏳ {this.state.pendingValue}</span>}
        {!this.state.pending && !this.state.error && !this.state.committed && annotation}
        <button className="btn btn-default" onClick={() => this.setState({ editing: true })} style={{ float: 'right' }}>Edit</button>
      </div>
  }
}

// Message Listener function
chrome.runtime.onMessage.addListener((request, sender, response) => {
  // If message is injectApp
  if (request.injectApp) {
    // Inject our app to DOM and send response
    injectApp()
    response({
      startedExtension: true,
    })
  }
})

function injectApp() {
  var cells = document.querySelectorAll(":not([data-scribe=injected])[title*=✻]")
  cells.forEach((cell) => {
    let row = cell.parentElement.parentElement.parentElement
    let vrf = row.querySelector("[title^=VRF]").textContent.trim()
    let address = row.querySelector("[title^=Address]").textContent.trim()
    let header = cell.title.match(/✻ (.*): /)[1]
    cell.setAttribute("data-scribe", "injected")
    ReactDOM.render(<Cell header={header} annotation={cell.textContent} vrf={vrf} address={address} />, cell)
  })
}
