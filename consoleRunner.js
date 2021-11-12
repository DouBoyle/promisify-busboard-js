import { createInterface } from 'readline';
import { URL } from 'url';
import request from 'request';

const readline = createInterface({
    input: process.stdin,
    output: process.stdout
});

const POSTCODES_BASE_URL = 'https://api.postcodes.io';
const TFL_BASE_URL = 'https://api.tfl.gov.uk';

export default class ConsoleRunner {

    promptForPostcode() {
        return new Promise((resolve) => {
            readline.question('\nEnter your postcode: ', function(postcode) {
                readline.close();
                resolve(postcode);
            });
        })
    }

    displayStopPoints(stopPoints) {
        stopPoints.forEach(point => {
            console.log(point.commonName);
        });
    }

    buildUrl(url, endpoint, parameters) {
        const requestUrl = new URL(endpoint, url);
        parameters.forEach(param => requestUrl.searchParams.append(param.name, param.value));
        return requestUrl.href;
    }

    makeGetRequest(baseUrl, endpoint, parameters) {
        const url = this.buildUrl(baseUrl, endpoint, parameters);

        return new Promise((resolve) => request.get(url, (err, response, body) => {
            if (err) {
                console.log(err);
            } else if (response.statusCode !== 200) {
                console.log(response.statusCode);
            } else {
                resolve(body);
            }
        }));
    }

    getLocationForPostCode(postcode) {
        return this.makeGetRequest(POSTCODES_BASE_URL, `postcodes/${postcode}`, [])
        .then(function(responseBody) {
            const jsonBody = JSON.parse(responseBody);
            return { latitude: jsonBody.result.latitude, longitude: jsonBody.result.longitude };
        });
    }

    getNearestStopPoints(latitude, longitude, count) {
        return this.makeGetRequest(
            TFL_BASE_URL,
            `StopPoint`, 
            [
                {name: 'stopTypes', value: 'NaptanPublicBusCoachTram'},
                {name: 'lat', value: latitude},
                {name: 'lon', value: longitude},
                {name: 'radius', value: 1000},
                {name: 'app_id', value: '' /* Enter your app id here */},
                {name: 'app_key', value: '' /* Enter your app key here */}
            ]
        ).then(function(responseBody) {
                const stopPoints = JSON.parse(responseBody).stopPoints.map(function(entity) { 
                    return { naptanId: entity.naptanId, commonName: entity.commonName };
                }).slice(0, count);
                return stopPoints;
            }
        );
    }

    run() {
        const that = this;
        that.promptForPostcode().then(function(postcode) {
            postcode = postcode.replace(/\s/g, '');
            that.getLocationForPostCode(postcode).then( function(location) {
                that.getNearestStopPoints(location.latitude, location.longitude, 5)
                .then(that.displayStopPoints);
            });
        });
    }
}