# Authentication

Authenticate to the backend by providing the API key expected by the server. If authentication succeeds, the endpoint returns a json embedding an access token and a refresh token (JSON Web Tokens). The access token must be passed as an argument or in the `Authorization` HTTP header for all later calls to the backend (account & pushtx REST API + websockets). The refresh token must be passed as an argument or in the `Authorization` HTTP header for later calls to /auth/refresh allowing to generate a new access token.

Authentication is activated in /keys/index.js configuration file

```
auth: {
  // Name of the authentication strategy used
  // Available values:
  //    null          : No authentication
  //    'localApiKey' : authentication with a shared local api key
  activeStrategy: 'localApiKey',
  // List of available authentication strategies
  strategies: {
    // Authentication with a shared local api key
    localApiKey: {
      // API key (alphanumeric characters)
      apiKey: 'myApiKey',
      // DO NOT MODIFY
      configurator: 'localapikey-strategy-configurator'
    }
  },
  // Configuration of Json Web Tokens
  // used for the management of authorizations
  jwt: {
    // Secret passphrase used by the server to sign the jwt
    // (alphanumeric characters)
    secret: 'myJwtSecret',
    accessToken: {
      // Number of seconds after which the jwt expires
      expires: 900
    },
    refreshToken: {
      // Number of seconds after which the jwt expires
      expires: 7200
    }
  }
},
```


```
POST /auth/login
```

The API Key must be passed in the body of the request as an url encoded argument.


## Parameters
* **apikey** - `string` - The API key securing access to the backend


### Example

```
POST /auth/login

apikey=myAPIKey
```

#### Success
Status code 200 with JSON response:
```json
{
  "authorizations": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJTYW1vdXJhaSBXYWxsZXQgYmFja2VuZCIsInR5cGUiOiJhY2Nlc3MtdG9rZW4iLCJpYXQiOjE1NDQxMDM5MjksImV4cCI6MTU0NDEwNDUyOX0.DDzz0EUEQS8vqdhfUwi_MFhjnSLKZ9nY-P55Yoi0wlI",
    "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJTYW1vdXJhaSBXYWxsZXQgYmFja2VuZCIsInR5cGUiOiJyZWZyZXNoLXRva2VuIiwiaWF0IjoxNTQ0MTAzOTI5LCJleHAiOjE1NDQxMTExMjl9.6gykKq31WL4Jq7hfmoTwi1fpmBTtAeFb4KjfmSO6l00"
  }
}
```

#### Failure
Status code 401
