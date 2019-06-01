var lib_auth = {

  /* SessionStorage Key used for access token */
  SESSION_STORE_ACCESS_TOKEN: 'access_token',

  /* SessionStorage Key used for the timestamp of the access token */
  SESSION_STORE_ACCESS_TOKEN_TS: 'access_token_ts',

  /* SessionStorage Key used for refresh token */
  SESSION_STORE_REFRESH_TOKEN: 'refresh_token',

  /* JWT Scheme */
  JWT_SCHEME: 'Bearer',


  /* 
   * Retrieves access token from session storage
   */
  getAccessToken: function() {
    return sessionStorage.getItem(this.SESSION_STORE_ACCESS_TOKEN);
  },

  /* 
   * Stores access token in session storage
   */
  setAccessToken: function(token) {
    const now = new Date();
    sessionStorage.setItem(this.SESSION_STORE_ACCESS_TOKEN_TS, now.getTime());
    sessionStorage.setItem(this.SESSION_STORE_ACCESS_TOKEN, token);
  },

  /* 
   * Retrieves refresh token from session storage
   */
  getRefreshToken: function() {
    return sessionStorage.getItem(this.SESSION_STORE_REFRESH_TOKEN);
  },

  /* 
   * Stores refresh token in session storage
   */
  setRefreshToken: function(token) {
    sessionStorage.setItem(this.SESSION_STORE_REFRESH_TOKEN, token);
  },

  /*
   * Refreshes the access token
   */
  refreshAccessToken: function() {
    if (!this.isAuthenticated()) {
      return;
    }

    const now = new Date();
    const atts = sessionStorage.getItem(this.SESSION_STORE_ACCESS_TOKEN_TS);
    const timeElapsed = (now.getTime() - atts) / 1000;

    // Refresh the access token if more than 10mn
    if (timeElapsed > 600) {
      const dataJson = {
        'rt': this.getRefreshToken()
      };

      let self = this;

      let deferred = lib_api.refreshToken(dataJson);

      deferred.then(
        function (result) {
          const auth = result['authorizations'];
          const accessToken = auth['access_token'];
          self.setAccessToken(accessToken);
        },
        function (jqxhr) {
          // Do nothing
        }
      );
    }
  },

  /*
   * Checks if user is authenticated
   */
  isAuthenticated: function() {
    // Checks that an access token is stored in session storage
    let token = this.getAccessToken();
    return (token && (token != 'null')) ? true : false;
  },

  /*
   * Local logout
   */
  logout: function() {
    // Clears session storage
    this.setRefreshToken(null);
    this.setAccessToken(null);
    sessionStorage.setItem('activeTab', '');
    lib_cmn.goToHomePage();
  }

}
