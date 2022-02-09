var appsettings = require('./appsettings.json');
const readline = require('readline');
var authObj = require('./auth.js');
var omfObj = require('./omfClient.js');

var success = true;
var errorCap = {};
const endpointTypes = {
  ADH: 'ADH',
  EDS: 'EDS',
  PI: 'PI',
};

global.ending = false;
global.appsettings = appsettings;
global.endpointTypes = endpointTypes;

var omfType = [
  {
    id: 'TankMeasurement',
    type: 'object',
    classification: 'dynamic',
    properties: {
      Time: { format: 'date-time', type: 'string', isindex: true },
      Pressure: {
        type: 'number',
        name: 'Tank Pressure',
        description: 'Tank Pressure in Pa',
      },
      Temperature: {
        type: 'number',
        name: 'Tank Temperature',
        description: 'Tank Temperature in K',
      },
    },
  },
];

var omfContainer = function () {
  return [
    {
      id: 'Tank1Measurements',
      typeid: 'TankMeasurement',
      typeVersion: '1.0.0.0',
    },
  ];
};

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

var refreshToken = function (res, authClient) {
  var obj = res.data;
  authClient.token = obj.access_token;
  authClient.tokenExpires = obj.expires_in;
};

var logError = function (err) {
  success = false;
  errorCap = err;

  console.log('Error');
  console.trace();
  console.log(err.message);
  console.log(err.stack);
  console.log(err.options.headers['Operation-Id']);
  throw err;
};

var nowSeconds = function () {
  return Date.now() / 1000;
};

var Selected = function (endpoint) {
  return endpoint.Selected;
};

var app = function (entries) {
  // Filter unselected endpoints
  appsettings.Endpoints = appsettings.Endpoints.filter(Selected);

  // Generate omf clients
  appsettings.Endpoints.forEach((endpoint) => {
    // Create base urls
    if (endpoint.EndpointType == endpointTypes.ADH) {
      endpoint.BaseEndpoint =
        endpoint.Resource +
        '/api/' +
        endpoint.ApiVersion +
        '/tenants/' +
        endpoint.TenantId +
        '/namespaces/' +
        endpoint.NamespaceId;
    } else if (endpoint.EndpointType == endpointTypes.EDS) {
      endpoint.BaseEndpoint =
        endpoint.Resource +
        '/api/' +
        endpoint.ApiVersion +
        '/tenants/default/namespaces/default';
    } else if (endpoint.EndpointType == endpointTypes.PI) {
      endpoint.BaseEndpoint = endpoint.Resource;
    } else {
      throw new Error('Invalid endpoint type');
    }

    // Create omf endpoint urls
    endpoint.OmfEndpoint = endpoint.BaseEndpoint + '/omf';

    // Create auth clients and omf clients
    var authClient = new authObj.AuthClient(endpoint.resource);
    endpoint.authClient = authClient;
    if (endpoint.EndpointType != endpointTypes.PI)
      var omfClient = new omfObj.OMFClient(
        endpoint.OmfEndpoint,
        authClient,
        null,
        null,
        endpoint.VerifySSL
      );
    else {
      omfClient = new omfObj.OMFClient(
        endpoint.OmfEndpoint,
        null,
        endpoint.Username,
        endpoint.Password,
        endpoint.VerifySSL
      );
    }
    endpoint.omfClient = omfClient;
  });

  // Send one time creates to each endpoint
  var oneTimeCreates = function (endpoint) {
    var getClientToken;

    if (endpoint.EndpointType == endpointTypes.ADH) {
      getClientToken = endpoint.authClient
        .getToken(endpoint.ClientId, endpoint.ClientSecret, endpoint.Resource)
        .then(function (res) {
          refreshToken(res, endpoint.authClient);
        })
        .catch(function (err) {
          throw err;
        });
    } else {
      getClientToken = new Promise(function (resolve, reject) {
        endpoint.authClient.tokenExpires = 0;
        resolve();
      });
    }

    var createType = getClientToken
      .then(function (res) {
        console.log('Creating Type');
        if (endpoint.authClient.tokenExpires >= nowSeconds) {
          return function (res) {
            refreshToken(res, endpoint.authClient);
            return endpoint.omfClient.createType(omfType);
          };
        } else {
          return endpoint.omfClient.createType(omfType);
        }
      })
      .catch(function (err) {
        logError(err);
      });

    var createContainer = createType
      .then(function (res) {
        console.log('Creating Container');
        containerObj = omfContainer();
        if (endpoint.authClient.tokenExpires >= nowSeconds) {
          return function (res) {
            refreshToken(res, endpoint.authClient);
            return endpoint.omfClient.createContainer(containerObj);
          };
        } else {
          return endpoint.omfClient.createContainer(containerObj);
        }
      })
      .catch(function (err) {
        logError(err);
      });

    return createContainer.catch(function (err) {
      logError(err);
    });
  };

  var sendDataWrapper = Promise.all(
    appsettings.Endpoints.map(oneTimeCreates)
  ).then(function (res) {
    entriesLocal = entries;
    console.log('Creating Data');
    if (entriesLocal.length > 0) {
      entriesLocal.forEach(function (val, index, array) {
        sendData(val);
      });
    }
    createData();
  });

  var createData = function () {
    if (!global.ending) {
      rl.question('Enter pressure, temperature? n to cancel:', (answer) => {
        sendData(answer);
      });
    }
  };

  var sendData = function (answer) {
    try {
      if (answer == 'n') {
        appFinished();
      } else {
        var arr = answer.split(',');
        var currtime = new Date();
        var dataStr = `[{ "containerid": "Tank1Measurements", "values": [{ "Time": "${currtime.toISOString()}", "Pressure": ${
          arr[0]
        }, "Temperature": ${arr[1]} }] }]`;
        var dataObj = JSON.parse(dataStr);

        // Send data to each endpoint
        return Promise.all(
          appsettings.Endpoints.map(function (endpoint) {
            if (endpoint.authClient.tokenExpires >= nowSeconds) {
              return function (res) {
                refreshToken(res, endpoint.authClient);
                return endpoint.omfClient
                  .createData(dataObj)
                  .then(createData());
              };
            } else {
              return endpoint.omfClient.createData(dataObj).then(createData());
            }
          })
        );
      }
    } catch (err) {
      logError(err);
      appFinished();
    }
  };

  var appFinished = function () {
    global.ending = true;
    console.log();

    if (!success) {
      throw errorCap;
    }
    console.log('All values sent successfully!');

    if (require.main === module) {
      process.exit();
    } else return 0;
  };

  if (!success) {
    throw errorCap;
  }

  return sendDataWrapper;
};

module.exports = { app, appsettings, omfType, omfContainer, nowSeconds };

process.argv = process.argv.slice(2);
if (require.main === module) {
  app(process.argv);
}
