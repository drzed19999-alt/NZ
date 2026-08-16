// -------------------------------------------------------------
// VT MARKETS — API ENDPOINT CONFIGURATION
//
// The frontend is plain static files, so there is no build step and no
// environment variable to read at runtime. This is the ONE place that decides
// which backend the pages talk to. It must load BEFORE homesubfiles/api-client.js,
// which reads window.VT_API_BASE first and otherwise falls back to localhost.
//
// ===> AFTER DEPLOYING THE API, PUT ITS URL IN PRODUCTION_API_BASE BELOW. <===
//
// Local development needs no change: anything served from localhost/127.0.0.1
// keeps pointing at the local API on :4000.
// -------------------------------------------------------------
(function (win) {
    'use strict';

    // The deployed API origin. No trailing slash.
    // Example: 'https://nz-api.vercel.app'
    var PRODUCTION_API_BASE = 'https://nz-api.vercel.app';

    var LOCAL_API_BASE = 'http://localhost:4000';

    var host = win.location.hostname;
    var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '';

    win.VT_API_BASE = isLocal ? LOCAL_API_BASE : PRODUCTION_API_BASE;

    // Deploying without editing the placeholder would send every request to a
    // domain that does not exist, and each call would fail as an opaque network
    // error. Say so once, loudly, instead.
    if (!isLocal && PRODUCTION_API_BASE.indexOf('REPLACE-WITH-YOUR-API') !== -1) {
        console.error(
            '[VT Markets] api-config.js still has the placeholder API URL. '
            + 'Set PRODUCTION_API_BASE to your deployed API origin — every request will fail until you do.'
        );
    }
})(window);
