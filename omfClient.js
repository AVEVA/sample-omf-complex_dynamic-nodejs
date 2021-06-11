var axios = require('axios');
var https = require('https');
var zlib = require('zlib');

var axiosNoSSL = (module.exports = {
  OMFClient: function (omfURL, client, basicId = null, basicPassword = null) {
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
        transformRequest: [(data, headers) => this.gzipCompress(data, headers)],
        httpsAgent: new https.Agent({
          keepAlive: true,
          rejectUnauthorized: global.config.VERIFY_SSL,
        }),
      });
    };

    // create a container
    this.createContainer = function (omfContainer) {
      return axios({
        url: omfURL,
        method: 'POST',
        headers: this.getHeadersType('container'),
        data: JSON.stringify(omfContainer).toString(),
        transformRequest: [(data, headers) => this.gzipCompress(data, headers)],
        httpsAgent: new https.Agent({
          keepAlive: true,
          rejectUnauthorized: global.config.VERIFY_SSL,
        }),
      });
    };

    // create data
    this.createData = function (omfContainer) {
      return axios({
        url: omfURL,
        method: 'POST',
        headers: this.getHeadersType('data'),
        data: JSON.stringify(omfContainer).toString(),
        transformRequest: [(data, headers) => this.gzipCompress(data, headers)],
        httpsAgent: new https.Agent({
          keepAlive: true,
          rejectUnauthorized: global.config.VERIFY_SSL,
        }),
      });
    };

    this.deleteType = function (omfType) {
      return axios({
        url: omfURL,
        method: 'POST',
        headers: this.getHeadersType('type', 'delete'),
        data: JSON.stringify(omfType).toString(),
        transformRequest: [(data, headers) => this.gzipCompress(data, headers)],
        httpsAgent: new https.Agent({
          keepAlive: true,
          rejectUnauthorized: global.config.VERIFY_SSL,
        }),
      });
    };

    // create a container
    this.deleteContainer = function (omfContainer) {
      return axios({
        url: omfURL,
        method: 'POST',
        headers: this.getHeadersType('container', 'delete'),
        data: JSON.stringify(omfContainer).toString(),
        transformRequest: [(data, headers) => this.gzipCompress(data, headers)],
        httpsAgent: new https.Agent({
          keepAlive: true,
          rejectUnauthorized: global.config.VERIFY_SSL,
        }),
      });
    };

    // gzip compresses a body
    this.gzipCompress = function (data, headers) {
      if (
        'Compression' in headers &&
        headers['Compression'].toLowerCase() === 'gzip'
      )
        return zlib.gzipSync(data);
      return data;
    };

    // returns headers
    this.getHeadersType = function (message_type, action = 'create') {
      var gzipHeaders = {};
      if (global.config.compression) {
        gzipHeaders = { 'Compression': 'gzip' };
      }
      if (basicId) {
        return Object.assign({
          messagetype: message_type,
          omfversion: '1.1',
          action: action,
          messageformat: 'json',
          Authorization:
            'Basic ' +
            new Buffer(basicId + ':' + basicPassword).toString('base64'),
          'x-requested-with': 'xmlhttprequest',
        }, gzipHeaders);
      } else if (client) {
        return Object.assign({
          Authorization: 'bearer ' + client.token,
          messagetype: message_type,
          omfversion: '1.1',
          action: action,
          messageformat: 'json',
        }, gzipHeaders);
      } else {
        return Object.assign({
          messagetype: message_type,
          omfversion: '1.1',
          action: action,
          messageformat: 'json',
        }, gzipHeaders);
      }
    };
  },
});
