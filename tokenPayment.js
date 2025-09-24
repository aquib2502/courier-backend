import axios from "axios";

const requestHeaders = {
  "Content-Type": "application/x-www-form-urlencoded"
};

const requestBodyJson = {
  "client_version": 1,
  "grant_type": "client_credentials",
  "client_id": "TEST-M23BJ0QBOM80I_25092",
  "client_secret": "MGMwYzQ4MTMtOWRkOS00MjBhLWE2M2YtOTVlNzM3OTkwYTVi"
};

const requestBody = new URLSearchParams(requestBodyJson).toString();

const options = {
  method: 'POST',
  url: 'https://api-preprod.phonepe.com/apis/pg-sandbox/v1/oauth/token',
  headers: requestHeaders,
	data: requestBody
};

axios.request(options)
  .then(function (response) {
    console.log(response.data);
  })
  .catch(function (error) {
    console.error(error);
  });