var Sample = require('../sample');
describe('Complex_Dynamic NodeJS Sample', function () {
  jasmine.DEFAULT_TIMEOUT_INTERVAL = 60000;

  beforeEach(function () {});

  it('should be able to complete the main method', function (done) {
    sample = Sample.app(['1,2', 'n'])
      .then(() => {
        global.appsettings.Endpoints.forEach((endpoint) => {
          if (endpoint.EndpointType == global.endpointTypes.ADH) {
            console.log('need to check data here since it is async');

            var axios = require('axios');
            url =
              endpoint.BaseEndpoint + '/streams/Tank1Measurements/data/last';
            return axios({
              url: url,
              method: 'GET',
              headers: { Authorization: 'bearer ' + endpoint.authClient.token },
            });
          } else {
            global.appsettings.Endpoints.forEach((endpoint) => {
              deleteContainer(endpoint, sample).then(
                deleteType(endpoint, sample)
              );
            });
          }
        });
      })
      .catch(function (err) {
        console.log(err);
        throw err;
      })
      .finally(function () {
        global.appsettings.Endpoints.forEach((endpoint) => {
          deleteContainer(endpoint, sample).then(deleteType(endpoint, sample));
        });
        done();
      });
  });
});

deleteContainer = function (endpoint, sample) {
  console.log('Deleting Container');
  containerObj = Sample.omfContainer();
  if (endpoint.tokenExpires >= sample.nowSeconds) {
    return function (res) {
      refreshToken(res, endpoint.authClient);
      return endpoint.omfClient.deleteContainer(containerObj);
    };
  } else {
    return endpoint.omfClient.deleteContainer(containerObj);
  }
};

deleteType = function (endpoint, sample) {
  console.log('Delete Type');
  if (endpoint.authClient.tokenExpires >= sample.nowSeconds) {
    return function (res) {
      refreshToken(res, endpoint.authClient);
      return endpoint.omfClient.deleteType(Sample.omfType);
    };
  } else {
    return endpoint.omfClient.deleteType(Sample.omfType);
  }
};
const { JUnitXmlReporter } = require('jasmine-reporters');
var junitReporter = new JUnitXmlReporter({
  savePath: 'TestResults',
});
jasmine.getEnv().addReporter(junitReporter);
