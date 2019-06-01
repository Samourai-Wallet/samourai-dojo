/**
 * Display Messages
 */

function displayInfoMsg(msg) {
  const htmlMsg = '<span class="info">' + msg + '</span>';
  $('#json-data').html(htmlMsg);
}

function displayErrorMsg(msg) {
  const htmlMsg = '<span class="error">' + msg + '</span>';
  $('#json-data').html(htmlMsg);
}

function displayQRPairing() {
  const activeTab = sessionStorage.getItem('activeTab');
  processAction(activeTab).then(
    function (result) {
      if (!result) {return;}
      const url = window.location.protocol + '//' + window.location.host + conf['api']['baseUri'];
      result['pairing']['url'] = url;
      const textJson = JSON.stringify(result, null, 4);
      $("#qr-pairing").html('') // clear qrcode first
      $('#qr-pairing').qrcode({width: 256, height: 256, text: textJson});
    },
    function (jqxhr) {}
  );
}

/**
 * On tab switched
 */
function initTabs() {
  // Activates the current tab
  let currentTab = sessionStorage.getItem('activeTab');
  if (!currentTab) {
    currentTab = '#link-pairing';
  }
  $(currentTab).addClass('active');
  
  const tabs = [
    '#link-pairing',
    '#link-status-api',
    '#link-status-pushtx',
    '#link-orchestrator',
    '#link-info-xpub',
    '#link-rescan-xpub',
    '#link-xpub',
    '#link-info-address',
    '#link-rescan-address',
    '#link-multiaddr',
    '#link-unspent',
    '#link-tx'
  ];

  // Sets event handlers
  for (let tab of tabs) {
    $(tab).click(function() {
      $(sessionStorage.getItem('activeTab')).removeClass('active');
      sessionStorage.setItem('activeTab', tab);
      $(tab).addClass('active');
      preparePage();
    });
  }
}

/**
 * Prepares the page content
 */
function preparePage() {
  const activeTab = sessionStorage.getItem('activeTab');

  // Pairing
  if (activeTab == '#link-pairing') {
    $('#screen-pairing').show();
    $('#form-maintenance').hide();
    displayQRPairing();

  // Maintenance screens
  } else {
    $('#form-maintenance').show();
    $('#screen-pairing').hide();

    let placeholder = '',
        placeholder2 = '',
        placeholder3 = '';

    $("#cell-args").removeClass('halfwidth');
    $("#cell-args").addClass('fullwidth');
    $("#cell-args2").hide();
    $("#cell-args3").hide();

    if (activeTab == '#link-status-api' ||
      activeTab == '#link-status-pushtx' ||
      activeTab == '#link-orchestrator'
    ) {
      $("#row-form-field").hide();
      $("#row-form-button").hide();
      processGo();
    } else {
      $("#row-form-field").show();
      $("#row-form-button").show();
    }

    if (activeTab == '#link-info-xpub') {
      placeholder = 'ENTER A XPUB, YPUB OR ZPUB';
    } else if (activeTab == '#link-xpub') {
      placeholder = 'ENTER /XPUB URL ARGUMENTS (e.g.: xpub=xpub0123456789&segwit=bip84&type=restore&force=true)';
    } else if (activeTab == '#link-info-address') {
      placeholder = 'ENTER A BITCOIN ADDRESS';
    } else if (activeTab == '#link-rescan-address') {
      placeholder = 'ENTER A BITCOIN ADDRESS';
    } else if (activeTab == '#link-multiaddr') {
      placeholder = 'ENTER /MULTIADDR URL ARGUMENTS (e.g.: active=xpub0123456789&new=address2|address3&pubkey=pubkey4)';
    } else if (activeTab == '#link-unspent') {
      placeholder = 'ENTER /UNSPENT URL ARGUMENTS (e.g.: active=xpub0123456789&new=address2|address3&pubkey=pubkey4)';
    } else if (activeTab == '#link-tx') {
      placeholder = 'ENTER A TRANSACTION TXID';
    } else if (activeTab == '#link-rescan-xpub') {
      $("#cell-args").removeClass('fullwidth');
      $("#cell-args").addClass('halfwidth');
      $("#cell-args2").show();
      $("#cell-args3").show();
      placeholder = 'ENTER A XPUB, YPUB OR ZPUB';
      placeholder2 = 'ENTER #ADDR. (DEFAULT=100)';
      placeholder3 = 'ENTER START INDEX (DEFAULT=0)';
    } 

    $("#args").attr('placeholder', placeholder);
    $('#args').val('');
    $("#args2").attr('placeholder', placeholder2);
    $('#args2').val('');
    $("#args3").attr('placeholder', placeholder3);
    $('#args3').val('');
    $('#json-data').html('');
  }
}

/**
 * Process action (api calls)
 */
function processAction(activeTab, args, args2, args3) {
  if (activeTab == '#link-pairing')
    return lib_api.getPairingInfo();
  else if (activeTab == '#link-status-api')
    return lib_api.getApiStatus();
  else if (activeTab == '#link-status-pushtx')
    return lib_api.getPushtxStatus();
  else if (activeTab == '#link-orchestrator')
    return lib_api.getOrchestratorStatus();

  if (args == '') {
    alert('Argument is mandatory');
    return;
  }

  if (activeTab == '#link-info-xpub') {
    return lib_api.getXpubInfo(args);
  } else if (activeTab == '#link-rescan-xpub') {
    const nbAddr = (!args2) ? 100 : parseInt(args2);
    const startIdx = (!args3) ? 0 : parseInt(args3);
    return lib_api.getXpubRescan(args, nbAddr, startIdx);
  } else if (activeTab == '#link-info-address') {
    return lib_api.getAddressInfo(args);
  } else if (activeTab == '#link-rescan-address') {
    return lib_api.getAddressRescan(args);
  } else if (activeTab == '#link-tx') {
    return lib_api.getTransaction(args);
  }

  const jsonData = {};
  const aArgs = args.split('&');
  for (let arg of aArgs) {
    const aArg = arg.split('=');
    jsonData[aArg[0]] = aArg[1];
  }

  if (activeTab == '#link-multiaddr')
    return lib_api.getMultiaddr(jsonData);
  else if (activeTab == '#link-unspent')
    return lib_api.getUnspent(jsonData);
  else if (activeTab == '#link-xpub')
    return lib_api.postXpub(jsonData);
}

/**
 * Retrieve information about the xpub
 */
function processGo() {
  const activeTab = sessionStorage.getItem('activeTab');
  const args = $("#args").val();
  const args2 = $("#args2").val();
  const args3 = $("#args3").val();

  displayInfoMsg('Processing...');

  let deferred = processAction(activeTab, args, args2, args3);

  deferred.then(
    function (result) {
      if (!result)
        return;
      let textJson = lib_fmt.cleanJson(result);
      textJson = JSON.stringify(JSON.parse(textJson), null, 4);
      textJson = lib_fmt.jsonSyntaxHighlight(textJson);
      $('#json-data').html(textJson);
    },
    function (jqxhr) {
      let hasErrorMsg = 
        ('responseJSON' in jqxhr) && 
        (jqxhr['responseJSON'] != null) && 
        ('message' in jqxhr['responseJSON']);

      const msg =  hasErrorMsg ? jqxhr['responseJSON']['message'] : jqxhr.statusText;
      displayErrorMsg(msg);
    }
  );
}

/**
 * Processing on loading completed
 */
$(document).ready(function() {
  // Refresh the access token if needed
  setInterval(() => {
    lib_auth.refreshAccessToken();
  }, 300000);
  
  initTabs();
  preparePage();

  // Sets the event handlers
  $('#args').keyup(function(evt) {
    if (evt.keyCode === 13) {
      processGo();
    }
  });
  $('#btn-go').click(function() {
    processGo();
  });
  $('#btn-logout').click(function() {
    lib_auth.logout();
  });
});
