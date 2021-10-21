var axios = require('axios');
var https = require('https');

module.exports = {
  OMFClient: function (
    omfURL,
    client,
    basicId = null,
    basicPassword = null,
    verifySSL = true
  ) {
    if (client) {
      this.tokenExpires = client.tokenExpires;
      this.getToken = client.getToken;
      this.token = client.token;
    }

    // create a type
    this.createType = function (omfType) {
      return axios({
        url: omfURL,
        method: 'POST',
        headers: this.getHeadersType('type'),
        data: JSON.stringify(omfType).toString(),
        httpsAgent: new https.Agent({ rejectUnauthorized: verifySSL }),
      });
    };

    // create a container
    this.createContainer = function (omfContainer) {
      return axios({
        url: omfURL,
        method: 'POST',
        headers: this.getHeadersType('container'),
        data: JSON.stringify(omfContainer).toString(),
        httpsAgent: new https.Agent({ rejectUnauthorized: verifySSL }),
      });
    };

    // create data
    this.createData = function (omfContainer) {
      return axios({
        url: omfURL,
        method: 'POST',
        headers: this.getHeadersType('data'),
        data: JSON.stringify(omfContainer).toString(),
        httpsAgent: new https.Agent({ rejectUnauthorized: verifySSL }),
      });
    };

    this.deleteType = function (omfType) {
      return axios({
        url: omfURL,
        method: 'POST',
        headers: this.getHeadersType('type', 'delete'),
        data: JSON.stringify(omfType).toString(),
        httpsAgent: new https.Agent({ rejectUnauthorized: verifySSL }),
      });
    };

    // create a container
    this.deleteContainer = function (omfContainer) {
      return axios({
        url: omfURL,
        method: 'POST',
        headers: this.getHeadersType('container', 'delete'),
        data: JSON.stringify(omfContainer).toString(),
        httpsAgent: new https.Agent({ rejectUnauthorized: verifySSL }),
      });
    };

    this.getHeadersType = function (message_type, action = 'create') {
      if (basicId) {
        return {
          messagetype: message_type,
          omfversion: '1.1',
          action: action,
          messageformat: 'json',
          'Content-type': 'application/json',
          Authorization:
            'Basic ' +
            new Buffer(basicId + ':' + basicPassword).toString('base64'),
          'x-requested-with': 'xmlhttprequest',
        };
      } else if (client) {
        return {
          Authorization: 'bearer ' + client.token,
          messagetype: message_type,
          omfversion: '1.1',
          action: action,
          messageformat: 'json',
          'Content-type': 'application/json',
        };
      } else {
        return {
          messagetype: message_type,
          omfversion: '1.1',
          action: action,
          messageformat: 'json',
          'Content-type': 'application/json',
        };
      }
    };
  },
};
