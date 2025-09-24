import axios from "axios";

const requestHeaders = {
  "Content-Type": "application/json",
  "Authorization": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHBpcmVzT24iOjE3NTg2NTU0MTQyMDAsIm1lcmNoYW50SWQiOiJURVNULU0yM0JKMFFCT004MEkifQ.KC2y36sDKF7kT4QcvYlmEDkogQJXnTfuwiTg_1aysgI"
};

const requestBody = {
  "amount": 1000,
  "expireAfter": 1200,
  "metaInfo": {
    "udf1": "additional-information-1",
    "udf2": "additional-information-2",
    "udf3": "additional-information-3",
    "udf4": "additional-information-4",
    "udf5": "additional-information-5"
  },
  "paymentFlow": {
    "type": "PG_CHECKOUT",
    "message": "Payment message used for collect requests",
    "merchantUrls": {
      "redirectUrl": ""
    }
  },
  "merchantOrderId": "YYMMDD"
};

const options = {
  method: 'POST',
  url: 'https://api-preprod.phonepe.com/apis/pg-sandbox/checkout/v2/pay',
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