ajax={};
ajax.x=function(){try{return new ActiveXObject('Msxml2.XMLHTTP')}catch(e){try{return new ActiveXObject('Microsoft.XMLHTTP')}catch(e){return new XMLHttpRequest()}}};
ajax.send=function(u,f,m,a){var x=ajax.x();x.open(m,u,true);x.onreadystatechange=function(){if(x.readyState==4)f(x.responseText)};if(m=='POST')x.setRequestHeader('Content-type','application/json');x.send(a)};
ajax.get=function(url,func){ajax.send(url,func,'GET')};
ajax.gets=function(url){var x=ajax.x();x.open('GET',url,false);x.send(null);return x.responseText};
ajax.getJSON=function(url){var x=ajax.x();x.open('GET',url,false);x.send(null);return ajax.parseJSON(x.responseText)};
ajax.post=function(url,func,args){ajax.send(url,func,'POST',args)};
ajax.parseJSON=function(data) {
    if ( typeof data !== "string" || !data ) {
        return null;
    }

    // Make sure the incoming data is actual JSON
    // Logic borrowed from http://json.org/json2.js
    if ( /^[\],:{}\s]*$/.test(data.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, "@")
        .replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]")
        .replace(/(?:^|:|,)(?:\s*\[)+/g, "")) ) {

        // Try to use the native JSON parser first
        return window.JSON && window.JSON.parse ?
            window.JSON.parse( data ) :
            (new Function("return " + data))();
    } else {
        throw new Error("Invalid JSON: "  + data);
    }
};
