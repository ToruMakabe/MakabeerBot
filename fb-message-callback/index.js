var https = require('https');
var documentClient = require("documentdb").DocumentClient;
const databaseUrl = "dbs/" + process.env.APPSETTING_DOCDB_DB_ID;

var client = new documentClient(process.env.APPSETTING_DOCDB_ENDPOINT, { "masterKey": process.env.APPSETTING_DOCDB_AUTHKEY });

function sendTextMessage(sender, text, context) {
  getDataFromDocDB().then(function (value) {
    var msgAll = value[0].randomDocument.beer + " " + value[1].randomDocument.msg;
    var postData = JSON.stringify({
      recipient: sender,
      message: {
        "attachment":{
          "type":"template",
          "payload":{
            "template_type":"button",
            "text":msgAll,
            "buttons":[
              {
                "type":"web_url",
                "url":value[0].randomDocument.url,
                "title":"詳しく"
              }
            ]
          }
        }
      }
    });
    var req = https.request({
      hostname: 'graph.facebook.com',
      port: 443,
      path: '/v2.6/me/messages',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + process.env.APPSETTING_FB_PAGE_TOKEN
      }
    });
    req.write(postData);
    req.end();
  }).catch(function(err){
    context.log(err);
  });  
}

function getRandomDoc(sprocUrl){
  return new Promise(function (resolve, reject) {
    const sprocParams = {};
    client.executeStoredProcedure(sprocUrl, sprocParams, function(err, result, responseHeaders) {
      if (err) {
        reject(err);
      }
      if (result) {
        resolve(result);
      }
    });
  });
}

var results = {
  beer: function getBeer() {
    var collectionUrl = databaseUrl + "/colls/beer";
    var sprocUrl = collectionUrl + "/sprocs/GetRandomDoc";
    return getRandomDoc(sprocUrl).then(function (result) {
      return result;
    });
  },
  eom: function getEom() {
    var collectionUrl = databaseUrl + "/colls/eom";
    var sprocUrl = collectionUrl + "/sprocs/GetRandomDoc";
    return getRandomDoc(sprocUrl).then(function (result) {
      return result;
    });
  }
}

function getDataFromDocDB() {
  return Promise.all([results.beer(), results.eom()]);
}

module.exports = function (context, req) {
  messaging_evts = req.body.entry[0].messaging;
  for (i = 0; i < messaging_evts.length; i++) {
    evt = req.body.entry[0].messaging[i];
    sender = evt.sender;
    if (evt.message && evt.message.text, context) {
      sendTextMessage(sender, evt.message.text, context);
    }
  }
  context.done();
};