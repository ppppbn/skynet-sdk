import { onCLS, onFID, onLCP, onFCP, onTTFB } from 'web-vitals';

(function(window) {

	if (window.Skynet) return;

  let Skynet = {};
  let SkynetUtils	= {};

  /* Skynet Utilities definitions */

  /* Needed to break the URL up if we want to ignore parameters */
  SkynetUtils.parseURL = function(url) {
      /* Save the unmodified url to 'href' property so
      the returned object matches the built-in location object */
      let locn = { href: url };

      /* Split the URL components */
      let urlParts = url.replace('//', '/').split('/');

      /* Store the protocol and host */
      locn.protocol = urlParts[0];

      if (urlParts.length > 1 ) {

        locn.host = urlParts[1];

        /* Extract port number from the host */
        urlParts[1] = urlParts[1].split(':');
        locn.hostname = urlParts[1][0];
        locn.port = urlParts[1].length > 1 ? urlParts[1][1] : '';

        /* Splice and join the remainder to get the pathname */
        urlParts.splice(0, 2);
        locn.pathname = '/' + urlParts.join('/');

        /* Extract hash */
        locn.pathname = locn.pathname.split('#');
        locn.hash = locn.pathname.length > 1 ? '#' + locn.pathname[1] : '';
        locn.pathname = locn.pathname[0];

        /* Extract search query */
        locn.pathname = locn.pathname.split('?');
        locn.search = locn.pathname.length > 1 ? '?' + locn.pathname[1] : '';
        locn.pathname = locn.pathname[0];
      }

      return locn;
  }

  SkynetUtils.matchDomains = function(loc, domains) {
    return (new RegExp( '(' + domains.join('|').replace(/\./g,'\\.').replace(/\*/g,'\\w+') + ')' )).test(loc);
  }

  SkynetUtils.stripQueries = function(loc) {
    let queries = {};
    /* Use the `replace` method of String to iterate over each
      name-value pair in the query string. */
    loc.search.replace(
      new RegExp('([^?=&]+)(=([^&]*))?', 'g'),
    /* For each matched query string pair, add that
    pair to the URL struct using the pre-equals
    value as the key. */
      function( $0, $1, $2, $3 ){
        /* Only if the key is NOT in the ignore list should we pick it up */
        if (Skynet.qsIgnore.indexOf($1.toLowerCase()) < 0) {
          queries[$1] = $3;
        }
      }
    );

    let search = '';
    for (let key in queries) {
      search += (search.length === 0 ? '?' : '&') + key + '=' + queries[key];
    };

    /* Rebuild the url */
    return (loc.protocol + loc.host + loc.pathname)
      +	(loc.search ? search : '' )
      +	( loc.hash ? loc.hash : '' );
  }

  /* Skynet configuration */

  /* Default metadata information */
  Skynet.metadata = {
    identity: '',
    customerId: 0
  };
  /* Default to debugging off */
  Skynet.debugMode = false;
  /* Default the index for the message to 0 in case there is more than one */
  Skynet.errorIndex = 0;
  /* Default the additional info message to blank */
  Skynet.additionalInfo = '';
  /* Default the URL to the backend service */
  Skynet.defaultBackendUrl = process.env.DEFAULT_BACKEND_URL;
  Skynet.backendUrl = '';
  /* Default the qsIgnore to nothing (ie pass everything on the querystring) */
  Skynet.qsIgnore = [];
  /* Default string to ignore */
  Skynet.ignoreString = 'zaloJSV2';
  /* Default ignored domains to nothing */
  Skynet.domainIgnore = [];
  /* Whitelist script domains which can trigger errors */
  Skynet.domainWhitelist = [];
  /* Whitelist error messages */
  Skynet.messageWhitelist = ['Uncaught TypeError: C is not a function', `TypeError: C is not a function. (In 'C(!0)', 'C' is undefined)`];
  /* Skynet project ID */
  Skynet.projectId = '';
  /* Max number of reports sent from a page (defaults to 10, false allows infinite) */
  Skynet.reportThreshold = 30;
  /* Set to false to log errors and also pass them through to the default handler
  (and see them in the browser's error console) */
  Skynet.trapErrors = false;
  /* Log errrors to browser console */
  Skynet.logToConsole = false;
  /* Skip CrossOrigin errors. These supply no helpful debugging info, and because
  of JavaScript injection from a (possibly ill-behaved) browser plugin, these can't
  be controlled from the app side. */
  Skynet.ignoreCrossOriginErrors = true;
  /* Snapshot request ID. This variable receive the request ID when save profiling resource logs */
  Skynet.snapshotRequestId = '';
  /* Add the hook to the onError event
      - First store any existing error handler for the page */
  Skynet.fnPreviousOnErrorHandler = window.onerror;
  /* - Attach our error handler */
  window.onerror = function(msg, fileLocation, lineNumber, columnNumber){
    Skynet.errorTrap(msg, fileLocation, lineNumber, columnNumber);
    if( typeof(Skynet.fnPreviousOnErrorHandler) === 'function') {
      /* Process any existing onerror handler */
      Skynet.fnPreviousOnErrorHandler(msg, fileLocation, lineNumber, columnNumber);
    }
    return Skynet.trapErrors;
  }

  /* Send error to server side, default approach is Skynet.sendRequest. */
  Skynet.sendError = function(index, url, fileLocation, lineNumber, columnNumber, info, msg) {
    try {
      Skynet.sendErrorInternal(index, url, fileLocation, lineNumber, columnNumber, info, msg)
    } catch (e) {
      Skynet.errorHandler('sendErrorInternal', e);
    }
  }

  /* Invoke Skynet.sendRequest method to send error. Overwrite this method to use custom send error method. */
  Skynet.sendErrorInternal = function(index, url, fileLocation, lineNumber, columnNumber, info, msg) {
    /* Format the data for the request */
    const requestData = {
      url,
      fileLocation,
      lineNumber,
      columnNumber,
      /* Information should be given enough within 256 chars */
      info: info ? info.substr(0, 256) : '',
      message: msg,
      metadata: Skynet.metadata,
    };

    /* and pass the error details to the Async logging sender
      if the Skynet.reportThreshold hasn't tripped */
    if (Skynet.reportThreshold > 0 || Skynet.reportThreshold === false) {
      if (Skynet.reportThreshold > 0) {
          Skynet.reportThreshold -= 1;
      }
      Skynet.sendRequest('error', {
        index,
        additionalType: requestData.additionalType || 'script-error',
        ...requestData,
      });
    }
  }

  /* Send performance tracking internal */
  Skynet.sendPerformanceDataInternal = function(performanceType, data) {
    const clonedPerformanceData = JSON.parse(JSON.stringify(data || {}));

    /* Timeout to make sure the configuration has been initialized */
    setTimeout(() => {
      Skynet.sendRequest('performance', {
        metadata: Skynet.metadata,
        ...clonedPerformanceData,
        entryType: performanceType,
        startTime: clonedPerformanceData?.startTime?.toString(),
      });
    }, 5000);
  }

  /* Calling tracking backend service */
  Skynet.sendRequest = function(type, data) {
    try {
      const backendUrl = Skynet.backendUrl || Skynet.defaultBackendUrl;
      const url = (type === 'performance')
        ? `${backendUrl}/performanceLog`
        : `${backendUrl}/errorLog`;
      const body = (type === 'performance') ? {
        projectId: Skynet.projectId,
        userAgent: navigator.userAgent,
        ...data
       } : {
        projectId: Skynet.projectId,
        userAgent: navigator.userAgent,
        ...data,
        message: data.message || data.error
      };

      if (body.message && body.message.includes(Skynet.ignoreString)) {
        return;
      }

      window.fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
      });
    } catch (e) {
      Skynet.errorHandler('sendRequest', e);
    }
  };

  /* Error handler to catch the sendRequest errors */
  Skynet.errorHandler = function(source, error) {
    let message = `Skynet encountered an unexpected error.\n\n
    Source: ${source}\nDescription: ${error.description}`;
    if (Skynet.debugMode) alert(message);
    else console.log(message);
  };

  /* Respond to an error being raised in the javascript */
  Skynet.errorTrap = function (msg, fileLocation, lineNumber, columnNumber) {

    /* When a whitelist exists only trigger errors from script coming from those domains */
    if (Skynet.domainWhitelist.length > 0 && !SkynetUtils.matchDomains(fileLocation,Skynet.domainWhitelist)) {
      console.log(`Skynet - report ignored because ${fileLocation} did not match the whitelist`);
      return;
    }

    if (Skynet.domainIgnore.length > 0 && SkynetUtils.matchDomains(fileLocation,Skynet.domainIgnore)) {
      console.log(`Skynet - report ignored because ${fileLocation} matched the blacklist`);
      return;
    }

    if (Skynet.ignoreCrossOriginErrors && (msg === 'Script Error' || msg === 'Script error.') && Number(lineNumber) === 0) {
      console.log('Skynet - cross origin script error ignored because no additional error info supplied.');
      return;
    }

    if (Skynet.messageWhitelist.length > 0 && Skynet.messageWhitelist.includes(msg)) {
      console.log('Skynet - error ignored because the message is in whitelist.');
      return;
    }

    let errorMessage =	`Error found in page: ${fileLocation}
      \n at line number: ${lineNumber}
      \n Error Message: ${msg}`;

    if (Skynet.additionalInfo) {
      errorMessage += '\n Information:' + Skynet.additionalInfo;
    }

      if (Skynet.logToConsole) {
        console.log(errorMessage);
      }

    /* If we are debugging on the page then display the error details */
    if (Skynet.debugMode) {
      alert(`Skynet caught an error\n--------------\n ${errorMessage}`);
    } else {
      Skynet.errorIndex += 1;

      /* If there are parameters we need to ignore on the querystring strip them off */
      let url = document.URL;
      if (Skynet.qsIgnore.length > 0) {
        /* Make sure the qsIgnore array is lowercased */
        Skynet.qsIgnore = Skynet.qsIgnore.map(item => item.toLowerCase());

        url = SkynetUtils.stripQueries(window.location);

        /* Now repeat the process for the file location, if it exists
        (in some cases, like an explicitly thrown exception, file location might be empty) */
        if (fileLocation && fileLocation.length > 1) {
          fileLocation = SkynetUtils.stripQueries( SkynetUtils.parseURL(fileLocation) );
        }
      }

      /* Send error information to server. */
      let index = Skynet.errorIndex;
      let info = Skynet.additionalInfo;
      Skynet.sendError(index, url, fileLocation, lineNumber, columnNumber, info, msg);
    }
    return true;
  }

  /* Send resource timing logs and navigation timing logs */ 
  Skynet.sendProfilingResourceLogs = function() {
    try {
      const backendUrl = Skynet.backendUrl || Skynet.defaultBackendUrl;
      const url = `${backendUrl}/profiling-resource-logs`;

      const performanceResourceTimingLogs = window?.performance?.getEntriesByType("resource") || [];
      const performanceNavigationTimingLogs = window?.performance?.getEntriesByType("navigation") || [];

      if (!performanceResourceTimingLogs?.length && !performanceNavigationTimingLogs?.length) {
        return
      }

      const body = {
        performanceResourceTimingLogs,
        performanceNavigationTimingLogs,
        projectId: Skynet.projectId,
        userAgent: navigator.userAgent,
        metadata: Skynet.metadata,
       };

      return window.fetch(url, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body),
      })
      .then((response) => response.json())
      .then((response) => {
        Skynet.snapshotRequestId = response.snapshotRequestId;
        return response.snapshotRequestId;
      });
    } catch (e) {
      Skynet.errorHandler('sendRequest', e);
    }
  }

  function stringify(obj) {
    let seen = [];
  
    return JSON.stringify(obj, function (key, val) {
      if (val && typeof val == 'object') {
        if (seen.indexOf(val) >= 0) {
          return;
        }
        seen.push(val);
      }
      return val;
    });
  }

  /* Measure FCP & LCP for performance tracking */
  function logAnalytics(metric) {
    Skynet.sendPerformanceDataInternal(metric.name, {
      delta: metric.delta,
      value: metric.value,
      rating: metric.rating,
      navigationType: metric.navigationType,
      pageUrl: window.location.href,
      ...(JSON.parse(stringify(metric?.entries?.[0])) || {}),
      element: metric?.entries?.[0]?.url || 
        (metric?.entries?.[0]?.element ? stringify(metric?.entries?.[0]?.element)?.slice(0, 300) : null )
    });
  }

  function getSampleRateConfig(cb) {
    const backendUrl = Skynet.backendUrl || Skynet.defaultBackendUrl;
    const url = `${backendUrl}/configs/sample-rate`;

    window.fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
    })
    .then((response) => response.json())
    .then((response) => cb(response));
  }

  function observePerformMarkAndMeasureLogs(snapshotRequestId) {
    const observer = new PerformanceObserver((list) => {
      const whitelistEntries = list.getEntries().filter((entry) => entry.name.includes('Telio'));
      
      if (whitelistEntries?.length) {
        const backendUrl = Skynet.backendUrl || Skynet.defaultBackendUrl;
        const url = `${backendUrl}/mark-and-measure-logs`;
        const body = {
          performanceMarkAndMeasureLogs: whitelistEntries,
          snapshotRequestId: snapshotRequestId || Skynet.snapshotRequestId,
        };
    
        window.fetch(url, {
          method: 'POST',
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body),
        });
      }
    });
    observer.observe({ entryTypes: ["measure", "mark"] });
  }
  
  onCLS(logAnalytics);
  onFID(logAnalytics);
  onLCP(logAnalytics);
  onFCP(logAnalytics);
  onTTFB(logAnalytics);

  window.onload = function() {
    window.setTimeout(() => {
      getSampleRateConfig(async (response) => {
        if (response.value && !isNaN(response.value) && Math.random() < Number(response.value)) {
          const snapshotRequestId = await Skynet.sendProfilingResourceLogs();
          observePerformMarkAndMeasureLogs(snapshotRequestId);
        }
      });
    }, 4000);
  };

  window.Skynet = Skynet;

})(window);