lib_fmt = {
    
  /*
   * Returns a stringified version of a cleaned json object
   */
  cleanJson: function(json) {
    let jsonText = JSON.stringify(json);
    jsonText = jsonText.replace(/'/g, '"').replace(/False/g, 'false').replace(/True/g, 'true');
    jsonText = jsonText.replace(/(Decimal\(")([0-9.E\-,]*)("\))/g, '"$2"');
    return jsonText;
  },

  /*
   * Highlight syntax of json data
   */
  jsonSyntaxHighlight: function(json) {
    if (typeof json != 'string') {
      json = JSON.stringify(json, undefined, 2);
    }

    json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, 
      function (match) {
        let cls = 'number';
        if (/^"/.test(match)) {
          if (/:$/.test(match)) {
            cls = 'key';
          } else {
            cls = 'string';
          }
        } else if (/true|false/.test(match)) {
          cls = 'boolean';
        } else if (/null/.test(match)) {
          cls = 'null';
        }
        return '<span class="' + cls + '">' + match + '</span>';
      }
    );
  },
  
  /*
   * Format a unix timestamp to locale date string
   */
  unixTsToLocaleString: function(ts) {
    let tmpDate = new Date(ts*1000);
    return tmpDate.toLocaleString();
  },
  
  /*
   * Format a unix timestamp into a readable date/hour
   */
  formatUnixTs: function(ts) {
    if (ts == null || ts == 0)
      return '-';
    
    let tmpDate = new Date(ts*1000),
        options = {hour: '2-digit', minute: '2-digit', hour12: false};
    return tmpDate.toLocaleDateString('fr-FR', options);
  }
}
