KTracking = KTracking || {
    listeners: []
};
KTracking.DEBUG = !1;
KTracking.COOKIE_SUBID = 'subid';
KTracking.COOKIE_SUBID_OLD = 's';
KTracking.COOKIE_TOKEN = 'token';
KTracking.COOKIE_TOKEN_old = 't';
KTracking.COOKIE_TTL = 1;
KTracking.request = function(path, params, cb) {
    if (cb) {
        this.responseCallback = cb
    } else {
        this.responseCallback = null
    }
    var head = document.head;
    var sep;
    var script = document.createElement('script');
    script.type = 'application/javascript';
    script.charset = 'utf-8';
    if (path.indexOf('?') == -1) {
        sep = '?'
    } else {
        sep = '&'
    }
    script.src = path + sep + params;
    if (this.DEBUG) {
        console.log('Request: ' + path + sep + params)
    }
    head.appendChild(script);
    head.removeChild(script)
};
KTracking.response = function(message) {
    if (this.DEBUG) {
        console.log('Response:', message)
    }
    this.responseCallback && this.responseCallback(message)
};
KTracking.onload = function(fn) {
    fn = fn.bind(KTracking);
    if (document.readyState == "complete")
        return fn();
    if (window.addEventListener)
        window.addEventListener("load", fn, !1);
    else if (window.attachEvent)
        window.attachEvent("onload", fn);
    else window.onload = fn
};
KTracking.cookieGet = function(name) {
    var nameEQ = name + "=",
        ca = document.cookie.split(';'),
        value = '',
        firstChar = '',
        parsed = {};
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
            value = decodeURIComponent(c.substring(nameEQ.length, c.length));
            firstChar = value.substring(0, 1);
            if (firstChar == "{") {
                try {
                    parsed = JSON.parse(value);
                    if ("v" in parsed) return parsed.v
                } catch (e) {
                    return value
                }
            }
            if (value == "undefined") return undefined;
            return value
        }
    }
    return null
};
KTracking.cookieSet = function(name, value, days) {
    var date = new Date(),
        expires = '',
        secureFlag = '';
    path = "/";
    if (days) {
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString()
    }
    if (this.multiDomain) {
        var parts = location.hostname.split('.').reverse();
        if (parts.length >= 2) {
            path += ";domain=" + parts[1] + "." + parts[0]
        }
    }
    var valueToUse = encodeURIComponent(value);
    document.cookie = name + "=" + valueToUse + expires + "; path=" + path + secureFlag
};
KTracking.reportConversion = function(revenue, status, otherParams, cb) {
    var params = 'return=jsonp';
    params += '&' + decodeURIComponent(window.location.search.replace('?', ''));
    params += '&revenue=' + revenue;
    params += '&sub_id=' + this.subId;
    if (typeof status != 'undefined') {
        params += '&status=' + status
    }
    if (typeof(otherParams) == 'string') {
        otherParams = {
            tid: otherParams
        }
    }
    if (typeof otherParams != 'undefined') {
        params += '&' + this.paramsToString(otherParams)
    }
    if (this.DEBUG) {
        console.log('Sending: ' + params)
    }
    this.request(this.P_PATH, params, cb)
};
KTracking.paramsToString = function(params) {
    var str = [];
    for (var p in params) {
        if (params.hasOwnProperty(p)) {
            str.push(encodeURIComponent(p) + "=" + encodeURIComponent(params[p]))
        }
    }
    return str.join("&")
};
KTracking.getSubId = function(cb) {
    this.subId = this.getParamFromQuery('_subid') || this.getParamFromQuery('subid');
    this.token = this.getParamFromQuery('_token') || this.getParamFromQuery('token');
    this.multiDomain = this['multiDomain'] || !1;
    var isNew = this.getParamFromQuery('_new') == '1' || this.collectNonUniqueClicks;
    if (!isNew) {
        if (this.subId === '') {
            this.subId = this.cookieGet(this.COOKIE_SUBID)
        }
        if (this.token === '') {
            this.token = this.cookieGet(this.COOKIE_TOKEN)
        }
    }
    if (!this.subId) {
        this.sendClickData(cb)
    } else {
        if (this.DEBUG) {
            console.log('Subid:' + this.subId);
            console.log('Token:' + this.token)
        }
        cb(this.subId, this.token)
    }
};
KTracking.getParamFromQuery = function(param) {
    var pattern = new RegExp(param + '=([^&]+)');
    return ((v = window.location.search.match(pattern)) == null ? '' : v[1])
};
KTracking.sendClickData = function(cb) {
    var params = 'return=jsonp';
    params += '&' + decodeURIComponent(window.location.search.replace('?', ''));
    params += '&se_referrer=' + encodeURIComponent(document.referrer);
    params += '&default_keyword=' + encodeURIComponent(document.title);
    params += '&landing_url=' + encodeURIComponent(document.location.hostname + document.location.pathname);
    this.request(this.R_PATH, params, (function(result) {
        if (typeof(result) == 'string') {
            this.subId = result
        } else {
            if (result && result.sub_id && result.sub_id.length > 0) {
                this.subId = result.sub_id
            }
            if (result && result.token && result.token.length > 0) {
                this.token = result.token
            }
        }
        if (!this.subId) {
            throw new Error('Tracker haven\'t returned subid: '.JSON.stringify(result))
        }
        if (this.DEBUG) {
            console.log('Subid:', this.subId);
            console.log('Token:', this.token)
        }
        cb(this.subId, this.token)
    }).bind(this))
};
KTracking.update = function(updateParams) {
    if (!this.subId) {
        throw new Error('KTracking.update must be loaded inside KTracking. ')
    }
    var params = '';
    params += '_update_tokens=1';
    params += '&sub_id=' + this.subId;
    params += '&' + this.paramsToString(updateParams);
    this.request(this.R_PATH, params, (function(result) {
        if (this.DEBUG) {
            console.log('Update result:', result)
        }
    }).bind(this))
};
KTracking.getOfferLink = function(token) {
    var baseSite = this.R_PATH.match(/(.*\/)/)[0];
    return baseSite + '?_lp=1&_token=' + token
};
KTracking.init = function() {
    this.getSubId((function(subId, token) {
        this.cookieSet(this.COOKIE_SUBID_OLD, subId, this.COOKIE_TTL);
        this.cookieSet(this.COOKIE_SUBID, subId, this.COOKIE_TTL);
        this.cookieSet(this.COOKIE_TOKEN_OLD, token, this.COOKIE_TTL);
        this.cookieSet(this.COOKIE_TOKEN, token, this.COOKIE_TTL);
        if (this.queued) {
            this.reportConversion(this.queued[0], this.queued[1], this.queued[2])
        }
        if (this.listeners) {
            for (var i = 0; i < this.listeners.length; i++) {
                this.listeners[i](subId, token)
            }
        }
        this.updateLinks(subId, token);
        this.updateInputs(subId, token);
        this.updateForms(subId, token)
    }).bind(this))
};
KTracking.updateLinks = function(subId, token) {
    var elms = document.getElementsByTagName('a');
    var offer = this.getOfferLink(token);
    for (var i = 0; i < elms.length; i++) {
        if (!elms[i].getAttribute("href")) {
            continue
        }
        if (elms[i].href && (elms[i].getAttribute("href").indexOf('subid') !== -1 || elms[i].getAttribute("href").indexOf('sub_id') !== -1)) {
            elms[i].href = elms[i].getAttribute("href").replace('{subid}', subId).replace('%7Bsubid%7D', subId).replace('{sub_id}', subId).replace('%7Bsub_id%7D', subId)
        }
        if (elms[i].getAttribute("href").indexOf('{offer}') !== -1 || elms[i].getAttribute("href").indexOf('%7Boffer%7D') !== -1) {
            elms[i].href = elms[i].getAttribute("href").replace('{offer}', offer).replace('%7Boffer%7D', offer)
        }
    }
};
KTracking.updateInputs = function(subId, token) {
    var elms = document.getElementsByTagName('input');
    for (var i = 0; i < elms.length; i++) {
        if (elms[i].name === 'sub_id' || elms[i].name === 'subid' || elms[i].value === '{subid}') {
            elms[i].value = subId
        }
    }
};
KTracking.updateForms = function(subId, token) {
    var forms = document.getElementsByTagName('form');
    var subIdInput = document.createElement('input');
    subIdInput.setAttribute('type', 'hidden');
    subIdInput.setAttribute('name', '_subid');
    subIdInput.setAttribute('value', subId);
    var tokenInput = document.createElement('input');
    tokenInput.setAttribute('type', 'hidden');
    tokenInput.setAttribute('name', '_token');
    tokenInput.setAttribute('value', token);
    for (var i = 0; i < forms.length; i++) {
        forms[i].appendChild(subIdInput.cloneNode(!0));
        forms[i].appendChild(tokenInput.cloneNode(!0))
    }
};
KTracking.onload(KTracking.init)