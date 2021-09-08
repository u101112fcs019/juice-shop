/*
 * A custom script to authenticate with the Agami CloudPort App
 *
 * First it makes a GET request and obtains the CSRF token from the response body.
 *
 * Then it makes a POST request with a body which contains username, password and the CSRF Token.
 *
 * A successful login will result in a 302 redirect. If this happens, a GET request is made to the dashboard URL.
 *
 * Every request made by this script is logged separately to the History tab.
 */

var debugMode = true;

function authenticate(helper, paramsValues, credentials) {
  var AuthenticationHelper = Java.type('org.zaproxy.zap.authentication.AuthenticationHelper');
  var HttpRequestHeader = Java.type("org.parosproxy.paros.network.HttpRequestHeader");
  var HttpHeader = Java.type("org.parosproxy.paros.network.HttpHeader");
  var URI = Java.type("org.apache.commons.httpclient.URI");

  var loginPageURL = paramsValues.get("Login Page URL"); // The URL where the login form is present. This is used by the AJAX spider to fill in the form
  var targetURL = paramsValues.get("Target URL"); // The URL where the login request with username, password, csrf token is sent.
  var dashboardURL = paramsValues.get("Dashboard URL"); // The URL where we'll redirect after login
  var baseURL = loginPageURL.match(/^(.+?[^\/:](?=[?\/]|$))/i)[1];

  //
  // First, make a GET request to the login page to get and extract the
  // csrf token from it.
  //

  debugMode && print("---- Amagi authentication script has started ----");

  // Build message.
  var firstRequestURI = new URI(loginPageURL, false);
  var firstRequestMethod = HttpRequestHeader.GET;
  var firstRequestMainHeader = new HttpRequestHeader(firstRequestMethod, firstRequestURI, HttpHeader.HTTP11);
  var firstMsg = helper.prepareMessage();
  firstMsg.setRequestHeader(firstRequestMainHeader);

  // Send message.
  helper.sendAndReceive(firstMsg, false);

  // Add message to ZAP history.
  AuthenticationHelper.addAuthMessageToHistory(firstMsg);

  // Get the csrf param from the response.
  var csrfParamValueRegEx = /name="csrf-param"\scontent="(.*)"/i;
  var csrfParamValue = firstMsg.getResponseBody().toString().match(csrfParamValueRegEx)[1];
  debugMode && print("Extracted the CSRF param:" + csrfParamValue);

  // Get the csrf token from the response.
  var csrfTokenValueRegEx = /name="csrf-token"\scontent="(.*)"/i;
  var csrfTokenValue = firstMsg.getResponseBody().toString().match(csrfTokenValueRegEx)[1];
  debugMode && print("Extracted the CSRF token:" + csrfTokenValue);

  //
  // Now, make a POST request to the login page with user credentials and
  // csrf token.
  //

  // Build body.
  var secondRequestBody = csrfParamValue + "=" + csrfTokenValue;
  secondRequestBody += "&" + paramsValues.get("Username field") + "=" + encodeURIComponent(credentials.getParam("Username"));
  secondRequestBody+= "&" + paramsValues.get("Password field") + "=" + encodeURIComponent(credentials.getParam("Password"));
  var extraPostData = paramsValues.get("Extra POST data");
  if (extraPostData && extraPostData.trim().length() > 0) {
    secondRequestBody += "&" + extraPostData.trim();
  };

  debugMode && print("Second Request Body:" + secondRequestBody);

  // Build header.
  var secondRequestURI = new URI(targetURL, false);
  var secondRequestMethod = HttpRequestHeader.POST;
  var secondRequestMainHeader = new HttpRequestHeader(secondRequestMethod, secondRequestURI, HttpHeader.HTTP11);

  // Build message.
  var secondMsg = helper.prepareMessage();
  secondMsg.setRequestBody(secondRequestBody);
  secondMsg.setRequestHeader(secondRequestMainHeader);
  secondMsg.getRequestHeader().setContentLength(secondMsg.getRequestBody().length());
  secondMsg.getRequestHeader().setHeader(HttpHeader.REFERER, loginPageURL);

  // Send message.
  helper.sendAndReceive(secondMsg, false);
  debugMode && print("Second Request SENT");


  // Get the status code of the response.
  var secondResponseStatusCode = secondMsg.getResponseHeader().getStatusCode();

  debugMode && print("Second Request HTTP Status CODE:" + secondResponseStatusCode);

  //
  // If the login is successful, the login page will respond with a 302
  // redirect. If it does, follow that redirect.
  //

  if (secondResponseStatusCode == "302") {
    // Add secondMsg to ZAP history
    AuthenticationHelper.addAuthMessageToHistory(secondMsg);

    // Build the URL to redirect to.
    //var redirectURL = baseURL + secondMsg.getResponseHeader().getHeader('Location');

    // Build message.
    //var thirdRequestURI = new URI(redirectURL, false);
    var thirdRequestURI = new URI(dashboardURL, false);

    var thirdRequestMethod = HttpRequestHeader.GET;
    var thirdRequestMainHeader = new HttpRequestHeader(thirdRequestMethod, thirdRequestURI, HttpHeader.HTTP11);
    var thirdMsg = helper.prepareMessage();
    thirdMsg.setRequestHeader(thirdRequestMainHeader);

    // Send message.
    helper.sendAndReceive(thirdMsg, false);

    return thirdMsg;
  } else {
    return secondMsg;
  }
}


function getRequiredParamsNames() {
  return ["Login Page URL", "Target URL", "Dashboard URL", "Username field", "Password field"];
}


function getOptionalParamsNames() {
  return ["Extra POST data"];
}


function getCredentialsParamsNames() {
  return ["Username", "Password"];
}
