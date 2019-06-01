var lib_api = {
  
  /**
   * Base URI
   */
  baseUri: conf['api']['baseUri'],

  /**
   * Authentication
   */
  signin: function(data) {
    let uri = this.baseUri + '/auth/login';
    return this.sendPostUriEncoded(uri, data);
  },

  /**
   * Gets a new access token 
   */
  refreshToken: function(data) {
    let uri = this.baseUri + '/auth/refresh';
    return this.sendPostUriEncoded(uri, data);
  },

  /**
   * API Status
   */
  getApiStatus: function() {
    let prefix = conf['prefixes']['status'];
    let uri = this.baseUri + '/' + prefix;
    return this.sendGetUriEncoded(uri, {});
  },

  /**
   * Get pairing info
   */
  getPairingInfo: function() {
    let prefix = conf['prefixes']['support'];
    let uri = this.baseUri + '/' + prefix + '/pairing';
    return this.sendGetUriEncoded(uri, {});
  },

  /**
   * PushTx Status
   */
  getPushtxStatus: function() {
    let prefix = conf['prefixes']['statusPushtx'];
    let uri = this.baseUri + '/pushtx/' + prefix;
    //let uri = 'http://127.0.0.1:8081/' + prefix;
    return this.sendGetUriEncoded(uri, {});
  },

  /**
   * Orchestrztor Status
   */
  getOrchestratorStatus: function() {
    let prefix = conf['prefixes']['statusPushtx'];
    let uri = this.baseUri + '/pushtx/' + prefix + '/schedule';
    //let uri = 'http://127.0.0.1:8081/' + prefix + '/schedule';
    return this.sendGetUriEncoded(uri, {});
  },

  /**
   * Gets information about an address
   */
  getAddressInfo: function(address) {
    let prefix = conf['prefixes']['support'];
    let uri = this.baseUri + '/' + prefix + '/address/' + address + '/info';
    return this.sendGetUriEncoded(uri, {});
  },

  /**
   * Rescans an address
   */
  getAddressRescan: function(address) {
    let prefix = conf['prefixes']['support'];
    let uri = this.baseUri + '/' + prefix + '/address/' + address + '/rescan';
    return this.sendGetUriEncoded(uri, {});
  },

  /**
   * Gets information about a xpub
   */
  getXpubInfo: function(xpub) {
    let prefix = conf['prefixes']['support'];
    let uri = this.baseUri + '/' + prefix + '/xpub/' + xpub + '/info';
    return this.sendGetUriEncoded(uri, {});
  },

  /**
   * Rescans a xpub
   */
  getXpubRescan: function(xpub, nbAddr, startIdx) {
    let prefix = conf['prefixes']['support'];
    let uri = this.baseUri + '/' + prefix + '/xpub/' + xpub + '/rescan';
    return this.sendGetUriEncoded(
      uri,
      {
        'gap': nbAddr,
        'startidx': startIdx
      }
    );
  },

  /**
   * Notifies the server of the new HD account for tracking.
   */
  postXpub: function(arguments) {
    let uri = this.baseUri + '/xpub';
    return this.sendPostUriEncoded(uri, arguments);
  },

  /**
   * Multiaddr
   */
  getMultiaddr: function(arguments) {
    let uri = this.baseUri + '/multiaddr';
    return this.sendGetUriEncoded(uri, arguments);
  },

  /**
   * Unspent
   */
  getUnspent: function(arguments) {
    let uri = this.baseUri + '/unspent';
    return this.sendGetUriEncoded(uri, arguments);
  },

  /**
   * Transaction
   */
  getTransaction: function(txid) {
    let uri = this.baseUri + '/tx/' + txid;
    return this.sendGetUriEncoded(uri, {});
  },


  /**
   * HTTP requests methods
   */
  sendGetUriEncoded: function(uri, data) {
    data['at'] = lib_auth.getAccessToken();

    let deferred = $.Deferred(),
        dataString = $.param(data);

    $.when($.ajax({
      url: uri,
      method: 'GET',
      data: dataString,
      contentType: "application/x-www-form-urlencoded; charset=utf-8"
    }))
    .done(function (result) {
      deferred.resolve(result);
    })
    .fail(function (jqxhr, textStatus, error) {
      deferred.reject(jqxhr);
    });

    return deferred.promise();
  },

  sendPostUriEncoded: function(uri, data) {
    data['at'] = lib_auth.getAccessToken();

    let deferred = $.Deferred(),
        dataString = $.param(data);

    $.when($.ajax({
      url: uri,
      method: 'POST',
      data: dataString,
      contentType: "application/x-www-form-urlencoded; charset=utf-8"
    }))
    .done(function (result) {
      deferred.resolve(result);
    })
    .fail(function (jqxhr, textStatus, error) {
      deferred.reject(jqxhr);
    });

    return deferred.promise();
  },

  sendGetJson: function(uri, data) {
    data['at'] = lib_auth.getAccessToken();

    let deferred = $.Deferred();

    $.when($.ajax({
      url: uri,
      method: 'GET',
      data: data,
    }))
    .done(function (result) {
      deferred.resolve(result);
    })
    .fail(function (jqxhr, textStatus, error) {
      deferred.reject(jqxhr);
    });

    return deferred.promise();
  },


  sendPostJson: function(uri, data) {
    data['at'] = lib_auth.getAccessToken();

    let deferred = $.Deferred(),
        dataString = JSON.stringify(data);

    $.when($.ajax({
      url: uri,
      method: 'POST',
      data: dataString,
      contentType: "application/json; charset=utf-8",
      dataType: 'json'
    }))
    .done(function (result) {
      deferred.resolve(result);
    })
    .fail(function (jqxhr, textStatus, error) {
      deferred.reject(jqxhr);
    });

    return deferred.promise();
  }

}
