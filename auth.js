var axios = require("axios");
const { URLSearchParams } = require('url');

var logError = function (err) {
  success = false;
  errorCap = err;
  console.trace();
  console.log(err.message);
  console.log(err.stack);
  console.log(err.options.headers["Operation-Id"]);
  throw err;
};

module.exports = {
  AuthClient: function (url) {
    this.url = url;
    this.token = "";
    this.tokenExpires = "";

    // returns an access token
    this.getToken = function (clientId, clientSecret, resource) {
      return axios({
        url: resource + '/identity/.well-known/openid-configuration',
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Accept-Encoding': 'gzip',
        },
      })
        .then(function (res) {
          var obj = res.data;
          authority = obj.token_endpoint;

          var body = new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: clientId,
            client_secret: clientSecret,
          });

          console.log(body.toString());

          return axios.post(authority, body.toString(), {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept-Encoding': 'gzip',
            },
          });
        })
        .catch(function (err) {
          logError(err);
        });
    };
  },
};
