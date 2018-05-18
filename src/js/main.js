/* global chrome */
import React from 'react'
import ReactDOM from 'react-dom'
import RestClient from './tetration'

// A Cell is injected into the Tetration UI for each existing table cell 
// that holds an annotation. Cell places an Edit button next to the current value.
// Clicking the edit button will replace the text with a user editable input 
// pre-populated with the current value. 
//
// On submission an API call will be made to update the annotation in the backend
// On error the UI will revert back to the original value and display a warning
// On success a timer icon will be displayed next to the updated value
// On reaching a 5 minute timeout, a success icon will replace the timer icon
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

  handleResponse(error, response) {
    if (error) {
      this.setState({ editing: false, error: true, pending: false, errorValue: "a connection error occured" })
      return
    }
    switch (response.statusCode) {
      case 200:
        this.setState({ editing: false, error: false, pending: true })
        this.successTimeout = setTimeout(() => this.setState({ pending: false, committed: true }), 300000) // declare success in 5 mins - TODO: something smarter
        break
      case 401:
        this.setState({ editing: false, error: true, pending: false, errorValue: `Your API credentials (or lack thereof) were not accepted for authentication` })
        break
      case 403:
        this.setState({ editing: false, error: true, pending: false, errorValue: `Your API credentials are correct, but you are not authorized` })
        break
      case 404:
        this.setState({ editing: false, error: true, pending: false, errorValue: `You are running an earlier unsupported TetrationOS. Please upgrade to a minimum of 2.3.1.41` })
        break
      default:
        this.setState({ editing: false, error: true, pending: false, errorValue: response.body || "an unknown error occurred" })
    }
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

      // There may be some pending updates that are < 5 mins old - 
      // we don't want to see their success icon now when this timeout triggers
      // as it will be stale
      clearTimeout(this.successTimeout)

      this.setState({ committed: false, pendingValue: value })
      rc.post(endpoint, this.handleResponse.bind(this), { json_body: body })
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
        {this.state.error && <span title={"Could not save because " + this.state.errorValue.toLowerCase()}>🚨 {annotation}</span>}
        {this.state.pending && <span title="Saved - pending back end confirmation..">⏳ {this.state.pendingValue}</span>}
        {!this.state.pending && !this.state.error && !this.state.committed && annotation}
        <button className="btn btn-default" onClick={() => this.setState({ editing: true })} style={{ float: 'right' }}>Edit</button>
      </div>
  }
}

// This Message Listener function will receive an event from the popup window when the 
// user wishes to inject the "Edit" buttons into the page
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
  // Only celect cells that have not previously had the extension injected (e.g. to handle when edit is clicked twice)
  var cells = document.querySelectorAll(":not([data-scribe=injected])[title*=✻]")
  cells.forEach((cell) => {
    let vrf = document.querySelector("#inventory-root-scope > span.scope-name").textContent.trim()
    let row = cell.parentElement.parentElement.parentElement
    let address = row.querySelector("[title^=Address]").textContent.trim()
    let header = cell.title.match(/✻ (.*): /)[1]
    cell.setAttribute("data-scribe", "injected")
    ReactDOM.render(<Cell header={header} annotation={cell.textContent} vrf={vrf} address={address} />, cell)
  })
}
