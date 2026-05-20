/*! For license information please see simon42-dashboard-strategy-editor.47a79ef8.js.LICENSE.txt */
"use strict";(self.webpackChunkdashboard_strategy_enhanced=self.webpackChunkdashboard_strategy_enhanced||[]).push([[8],{651(e,t,i){var n=i(684),o=i(781);function a(e){return null==e}var r={isNothing:a,isObject:function(e){return"object"==typeof e&&null!==e},toArray:function(e){return Array.isArray(e)?e:a(e)?[]:[e]},repeat:function(e,t){var i,n="";for(i=0;i<t;i+=1)n+=e;return n},isNegativeZero:function(e){return 0===e&&Number.NEGATIVE_INFINITY===1/e},extend:function(e,t){var i,n,o,a;if(t)for(i=0,n=(a=Object.keys(t)).length;i<n;i+=1)e[o=a[i]]=t[o];return e}};function s(e,t){var i="",n=e.reason||"(unknown reason)";return e.mark?(e.mark.name&&(i+='in "'+e.mark.name+'" '),i+="("+(e.mark.line+1)+":"+(e.mark.column+1)+")",!t&&e.mark.snippet&&(i+="\n\n"+e.mark.snippet),n+" "+i):n}function c(e,t){Error.call(this),this.name="YAMLException",this.reason=e,this.mark=t,this.message=s(this,!1),Error.captureStackTrace?Error.captureStackTrace(this,this.constructor):this.stack=(new Error).stack||""}c.prototype=Object.create(Error.prototype),c.prototype.constructor=c,c.prototype.toString=function(e){return this.name+": "+s(this,e)};var l=c;function d(e,t,i,n,o){var a="",r="",s=Math.floor(o/2)-1;return n-t>s&&(t=n-s+(a=" ... ").length),i-n>s&&(i=n+s-(r=" ...").length),{str:a+e.slice(t,i).replace(/\t/g,"→")+r,pos:n-t+a.length}}function h(e,t){return r.repeat(" ",t-e.length)+e}var p=["kind","multi","resolve","construct","instanceOf","predicate","represent","representName","defaultStyle","styleAliases"],u=["scalar","sequence","mapping"],g=function(e,t){if(t=t||{},Object.keys(t).forEach(function(t){if(-1===p.indexOf(t))throw new l('Unknown option "'+t+'" is met in definition of "'+e+'" YAML type.')}),this.options=t,this.tag=e,this.kind=t.kind||null,this.resolve=t.resolve||function(){return!0},this.construct=t.construct||function(e){return e},this.instanceOf=t.instanceOf||null,this.predicate=t.predicate||null,this.represent=t.represent||null,this.representName=t.representName||null,this.defaultStyle=t.defaultStyle||null,this.multi=t.multi||!1,this.styleAliases=function(e){var t={};return null!==e&&Object.keys(e).forEach(function(i){e[i].forEach(function(e){t[String(e)]=i})}),t}(t.styleAliases||null),-1===u.indexOf(this.kind))throw new l('Unknown kind "'+this.kind+'" is specified for "'+e+'" YAML type.')};function _(e,t){var i=[];return e[t].forEach(function(e){var t=i.length;i.forEach(function(i,n){i.tag===e.tag&&i.kind===e.kind&&i.multi===e.multi&&(t=n)}),i[t]=e}),i}function m(e){return this.extend(e)}m.prototype.extend=function(e){var t=[],i=[];if(e instanceof g)i.push(e);else if(Array.isArray(e))i=i.concat(e);else{if(!e||!Array.isArray(e.implicit)&&!Array.isArray(e.explicit))throw new l("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");e.implicit&&(t=t.concat(e.implicit)),e.explicit&&(i=i.concat(e.explicit))}t.forEach(function(e){if(!(e instanceof g))throw new l("Specified list of YAML types (or a single Type object) contains a non-Type object.");if(e.loadKind&&"scalar"!==e.loadKind)throw new l("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");if(e.multi)throw new l("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.")}),i.forEach(function(e){if(!(e instanceof g))throw new l("Specified list of YAML types (or a single Type object) contains a non-Type object.")});var n=Object.create(m.prototype);return n.implicit=(this.implicit||[]).concat(t),n.explicit=(this.explicit||[]).concat(i),n.compiledImplicit=_(n,"implicit"),n.compiledExplicit=_(n,"explicit"),n.compiledTypeMap=function(){var e,t,i={scalar:{},sequence:{},mapping:{},fallback:{},multi:{scalar:[],sequence:[],mapping:[],fallback:[]}};function n(e){e.multi?(i.multi[e.kind].push(e),i.multi.fallback.push(e)):i[e.kind][e.tag]=i.fallback[e.tag]=e}for(e=0,t=arguments.length;e<t;e+=1)arguments[e].forEach(n);return i}(n.compiledImplicit,n.compiledExplicit),n};var f=m,y=new g("tag:yaml.org,2002:str",{kind:"scalar",construct:function(e){return null!==e?e:""}}),v=new g("tag:yaml.org,2002:seq",{kind:"sequence",construct:function(e){return null!==e?e:[]}}),b=new g("tag:yaml.org,2002:map",{kind:"mapping",construct:function(e){return null!==e?e:{}}}),x=new f({explicit:[y,v,b]}),w=new g("tag:yaml.org,2002:null",{kind:"scalar",resolve:function(e){if(null===e)return!0;var t=e.length;return 1===t&&"~"===e||4===t&&("null"===e||"Null"===e||"NULL"===e)},construct:function(){return null},predicate:function(e){return null===e},represent:{canonical:function(){return"~"},lowercase:function(){return"null"},uppercase:function(){return"NULL"},camelcase:function(){return"Null"},empty:function(){return""}},defaultStyle:"lowercase"}),$=new g("tag:yaml.org,2002:bool",{kind:"scalar",resolve:function(e){if(null===e)return!1;var t=e.length;return 4===t&&("true"===e||"True"===e||"TRUE"===e)||5===t&&("false"===e||"False"===e||"FALSE"===e)},construct:function(e){return"true"===e||"True"===e||"TRUE"===e},predicate:function(e){return"[object Boolean]"===Object.prototype.toString.call(e)},represent:{lowercase:function(e){return e?"true":"false"},uppercase:function(e){return e?"TRUE":"FALSE"},camelcase:function(e){return e?"True":"False"}},defaultStyle:"lowercase"});function C(e){return 48<=e&&e<=57||65<=e&&e<=70||97<=e&&e<=102}function k(e){return 48<=e&&e<=55}function S(e){return 48<=e&&e<=57}var A=new g("tag:yaml.org,2002:int",{kind:"scalar",resolve:function(e){if(null===e)return!1;var t,i=e.length,n=0,o=!1;if(!i)return!1;if("-"!==(t=e[n])&&"+"!==t||(t=e[++n]),"0"===t){if(n+1===i)return!0;if("b"===(t=e[++n])){for(n++;n<i;n++)if("_"!==(t=e[n])){if("0"!==t&&"1"!==t)return!1;o=!0}return o&&"_"!==t}if("x"===t){for(n++;n<i;n++)if("_"!==(t=e[n])){if(!C(e.charCodeAt(n)))return!1;o=!0}return o&&"_"!==t}if("o"===t){for(n++;n<i;n++)if("_"!==(t=e[n])){if(!k(e.charCodeAt(n)))return!1;o=!0}return o&&"_"!==t}}if("_"===t)return!1;for(;n<i;n++)if("_"!==(t=e[n])){if(!S(e.charCodeAt(n)))return!1;o=!0}return!(!o||"_"===t)},construct:function(e){var t,i=e,n=1;if(-1!==i.indexOf("_")&&(i=i.replace(/_/g,"")),"-"!==(t=i[0])&&"+"!==t||("-"===t&&(n=-1),t=(i=i.slice(1))[0]),"0"===i)return 0;if("0"===t){if("b"===i[1])return n*parseInt(i.slice(2),2);if("x"===i[1])return n*parseInt(i.slice(2),16);if("o"===i[1])return n*parseInt(i.slice(2),8)}return n*parseInt(i,10)},predicate:function(e){return"[object Number]"===Object.prototype.toString.call(e)&&e%1==0&&!r.isNegativeZero(e)},represent:{binary:function(e){return e>=0?"0b"+e.toString(2):"-0b"+e.toString(2).slice(1)},octal:function(e){return e>=0?"0o"+e.toString(8):"-0o"+e.toString(8).slice(1)},decimal:function(e){return e.toString(10)},hexadecimal:function(e){return e>=0?"0x"+e.toString(16).toUpperCase():"-0x"+e.toString(16).toUpperCase().slice(1)}},defaultStyle:"decimal",styleAliases:{binary:[2,"bin"],octal:[8,"oct"],decimal:[10,"dec"],hexadecimal:[16,"hex"]}}),E=new RegExp("^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"),z=/^[-+]?[0-9]+e/,O=new g("tag:yaml.org,2002:float",{kind:"scalar",resolve:function(e){return null!==e&&!(!E.test(e)||"_"===e[e.length-1])},construct:function(e){var t,i;return i="-"===(t=e.replace(/_/g,"").toLowerCase())[0]?-1:1,"+-".indexOf(t[0])>=0&&(t=t.slice(1)),".inf"===t?1===i?Number.POSITIVE_INFINITY:Number.NEGATIVE_INFINITY:".nan"===t?NaN:i*parseFloat(t,10)},predicate:function(e){return"[object Number]"===Object.prototype.toString.call(e)&&(e%1!=0||r.isNegativeZero(e))},represent:function(e,t){var i;if(isNaN(e))switch(t){case"lowercase":return".nan";case"uppercase":return".NAN";case"camelcase":return".NaN"}else if(Number.POSITIVE_INFINITY===e)switch(t){case"lowercase":return".inf";case"uppercase":return".INF";case"camelcase":return".Inf"}else if(Number.NEGATIVE_INFINITY===e)switch(t){case"lowercase":return"-.inf";case"uppercase":return"-.INF";case"camelcase":return"-.Inf"}else if(r.isNegativeZero(e))return"-0.0";return i=e.toString(10),z.test(i)?i.replace("e",".e"):i},defaultStyle:"lowercase"}),q=x.extend({implicit:[w,$,A,O]}),D=q,T=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"),I=new RegExp("^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"),F=new g("tag:yaml.org,2002:timestamp",{kind:"scalar",resolve:function(e){return null!==e&&(null!==T.exec(e)||null!==I.exec(e))},construct:function(e){var t,i,n,o,a,r,s,c,l=0,d=null;if(null===(t=T.exec(e))&&(t=I.exec(e)),null===t)throw new Error("Date resolve error");if(i=+t[1],n=+t[2]-1,o=+t[3],!t[4])return new Date(Date.UTC(i,n,o));if(a=+t[4],r=+t[5],s=+t[6],t[7]){for(l=t[7].slice(0,3);l.length<3;)l+="0";l=+l}return t[9]&&(d=6e4*(60*+t[10]+ +(t[11]||0)),"-"===t[9]&&(d=-d)),c=new Date(Date.UTC(i,n,o,a,r,s,l)),d&&c.setTime(c.getTime()-d),c},instanceOf:Date,represent:function(e){return e.toISOString()}}),j=new g("tag:yaml.org,2002:merge",{kind:"scalar",resolve:function(e){return"<<"===e||null===e}}),L="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r",M=new g("tag:yaml.org,2002:binary",{kind:"scalar",resolve:function(e){if(null===e)return!1;var t,i,n=0,o=e.length,a=L;for(i=0;i<o;i++)if(!((t=a.indexOf(e.charAt(i)))>64)){if(t<0)return!1;n+=6}return n%8==0},construct:function(e){var t,i,n=e.replace(/[\r\n=]/g,""),o=n.length,a=L,r=0,s=[];for(t=0;t<o;t++)t%4==0&&t&&(s.push(r>>16&255),s.push(r>>8&255),s.push(255&r)),r=r<<6|a.indexOf(n.charAt(t));return 0==(i=o%4*6)?(s.push(r>>16&255),s.push(r>>8&255),s.push(255&r)):18===i?(s.push(r>>10&255),s.push(r>>2&255)):12===i&&s.push(r>>4&255),new Uint8Array(s)},predicate:function(e){return"[object Uint8Array]"===Object.prototype.toString.call(e)},represent:function(e){var t,i,n="",o=0,a=e.length,r=L;for(t=0;t<a;t++)t%3==0&&t&&(n+=r[o>>18&63],n+=r[o>>12&63],n+=r[o>>6&63],n+=r[63&o]),o=(o<<8)+e[t];return 0==(i=a%3)?(n+=r[o>>18&63],n+=r[o>>12&63],n+=r[o>>6&63],n+=r[63&o]):2===i?(n+=r[o>>10&63],n+=r[o>>4&63],n+=r[o<<2&63],n+=r[64]):1===i&&(n+=r[o>>2&63],n+=r[o<<4&63],n+=r[64],n+=r[64]),n}}),N=Object.prototype.hasOwnProperty,U=Object.prototype.toString,P=new g("tag:yaml.org,2002:omap",{kind:"sequence",resolve:function(e){if(null===e)return!0;var t,i,n,o,a,r=[],s=e;for(t=0,i=s.length;t<i;t+=1){if(n=s[t],a=!1,"[object Object]"!==U.call(n))return!1;for(o in n)if(N.call(n,o)){if(a)return!1;a=!0}if(!a)return!1;if(-1!==r.indexOf(o))return!1;r.push(o)}return!0},construct:function(e){return null!==e?e:[]}}),R=Object.prototype.toString,V=new g("tag:yaml.org,2002:pairs",{kind:"sequence",resolve:function(e){if(null===e)return!0;var t,i,n,o,a,r=e;for(a=new Array(r.length),t=0,i=r.length;t<i;t+=1){if(n=r[t],"[object Object]"!==R.call(n))return!1;if(1!==(o=Object.keys(n)).length)return!1;a[t]=[o[0],n[o[0]]]}return!0},construct:function(e){if(null===e)return[];var t,i,n,o,a,r=e;for(a=new Array(r.length),t=0,i=r.length;t<i;t+=1)n=r[t],o=Object.keys(n),a[t]=[o[0],n[o[0]]];return a}}),Y=Object.prototype.hasOwnProperty,B=new g("tag:yaml.org,2002:set",{kind:"mapping",resolve:function(e){if(null===e)return!0;var t,i=e;for(t in i)if(Y.call(i,t)&&null!==i[t])return!1;return!0},construct:function(e){return null!==e?e:{}}}),W=D.extend({implicit:[F,j],explicit:[M,P,V,B]}),H=Object.prototype.hasOwnProperty,K=/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/,G=/[\x85\u2028\u2029]/,Z=/[,\[\]\{\}]/,Q=/^(?:!|!!|![a-z\-]+!)$/i,J=/^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;function X(e){return Object.prototype.toString.call(e)}function ee(e){return 10===e||13===e}function te(e){return 9===e||32===e}function ie(e){return 9===e||32===e||10===e||13===e}function ne(e){return 44===e||91===e||93===e||123===e||125===e}function oe(e){var t;return 48<=e&&e<=57?e-48:97<=(t=32|e)&&t<=102?t-97+10:-1}function ae(e){return 120===e?2:117===e?4:85===e?8:0}function re(e){return 48<=e&&e<=57?e-48:-1}function se(e){return 48===e?"\0":97===e?"":98===e?"\b":116===e||9===e?"\t":110===e?"\n":118===e?"\v":102===e?"\f":114===e?"\r":101===e?"":32===e?" ":34===e?'"':47===e?"/":92===e?"\\":78===e?"":95===e?" ":76===e?"\u2028":80===e?"\u2029":""}function ce(e){return e<=65535?String.fromCharCode(e):String.fromCharCode(55296+(e-65536>>10),56320+(e-65536&1023))}function le(e,t,i){"__proto__"===t?Object.defineProperty(e,t,{configurable:!0,enumerable:!0,writable:!0,value:i}):e[t]=i}for(var de=new Array(256),he=new Array(256),pe=0;pe<256;pe++)de[pe]=se(pe)?1:0,he[pe]=se(pe);function ue(e,t){this.input=e,this.filename=t.filename||null,this.schema=t.schema||W,this.onWarning=t.onWarning||null,this.legacy=t.legacy||!1,this.json=t.json||!1,this.listener=t.listener||null,this.implicitTypes=this.schema.compiledImplicit,this.typeMap=this.schema.compiledTypeMap,this.length=e.length,this.position=0,this.line=0,this.lineStart=0,this.lineIndent=0,this.firstTabInLine=-1,this.documents=[]}function ge(e,t){var i={name:e.filename,buffer:e.input.slice(0,-1),position:e.position,line:e.line,column:e.position-e.lineStart};return i.snippet=function(e,t){if(t=Object.create(t||null),!e.buffer)return null;t.maxLength||(t.maxLength=79),"number"!=typeof t.indent&&(t.indent=1),"number"!=typeof t.linesBefore&&(t.linesBefore=3),"number"!=typeof t.linesAfter&&(t.linesAfter=2);for(var i,n=/\r?\n|\r|\0/g,o=[0],a=[],s=-1;i=n.exec(e.buffer);)a.push(i.index),o.push(i.index+i[0].length),e.position<=i.index&&s<0&&(s=o.length-2);s<0&&(s=o.length-1);var c,l,p="",u=Math.min(e.line+t.linesAfter,a.length).toString().length,g=t.maxLength-(t.indent+u+3);for(c=1;c<=t.linesBefore&&!(s-c<0);c++)l=d(e.buffer,o[s-c],a[s-c],e.position-(o[s]-o[s-c]),g),p=r.repeat(" ",t.indent)+h((e.line-c+1).toString(),u)+" | "+l.str+"\n"+p;for(l=d(e.buffer,o[s],a[s],e.position,g),p+=r.repeat(" ",t.indent)+h((e.line+1).toString(),u)+" | "+l.str+"\n",p+=r.repeat("-",t.indent+u+3+l.pos)+"^\n",c=1;c<=t.linesAfter&&!(s+c>=a.length);c++)l=d(e.buffer,o[s+c],a[s+c],e.position-(o[s]-o[s+c]),g),p+=r.repeat(" ",t.indent)+h((e.line+c+1).toString(),u)+" | "+l.str+"\n";return p.replace(/\n$/,"")}(i),new l(t,i)}function _e(e,t){throw ge(e,t)}function me(e,t){e.onWarning&&e.onWarning.call(null,ge(e,t))}var fe={YAML:function(e,t,i){var n,o,a;null!==e.version&&_e(e,"duplication of %YAML directive"),1!==i.length&&_e(e,"YAML directive accepts exactly one argument"),null===(n=/^([0-9]+)\.([0-9]+)$/.exec(i[0]))&&_e(e,"ill-formed argument of the YAML directive"),o=parseInt(n[1],10),a=parseInt(n[2],10),1!==o&&_e(e,"unacceptable YAML version of the document"),e.version=i[0],e.checkLineBreaks=a<2,1!==a&&2!==a&&me(e,"unsupported YAML version of the document")},TAG:function(e,t,i){var n,o;2!==i.length&&_e(e,"TAG directive accepts exactly two arguments"),n=i[0],o=i[1],Q.test(n)||_e(e,"ill-formed tag handle (first argument) of the TAG directive"),H.call(e.tagMap,n)&&_e(e,'there is a previously declared suffix for "'+n+'" tag handle'),J.test(o)||_e(e,"ill-formed tag prefix (second argument) of the TAG directive");try{o=decodeURIComponent(o)}catch(t){_e(e,"tag prefix is malformed: "+o)}e.tagMap[n]=o}};function ye(e,t,i,n){var o,a,r,s;if(t<i){if(s=e.input.slice(t,i),n)for(o=0,a=s.length;o<a;o+=1)9===(r=s.charCodeAt(o))||32<=r&&r<=1114111||_e(e,"expected valid JSON character");else K.test(s)&&_e(e,"the stream contains non-printable characters");e.result+=s}}function ve(e,t,i,n){var o,a,s,c;for(r.isObject(i)||_e(e,"cannot merge mappings; the provided source object is unacceptable"),s=0,c=(o=Object.keys(i)).length;s<c;s+=1)a=o[s],H.call(t,a)||(le(t,a,i[a]),n[a]=!0)}function be(e,t,i,n,o,a,r,s,c){var l,d;if(Array.isArray(o))for(l=0,d=(o=Array.prototype.slice.call(o)).length;l<d;l+=1)Array.isArray(o[l])&&_e(e,"nested arrays are not supported inside keys"),"object"==typeof o&&"[object Object]"===X(o[l])&&(o[l]="[object Object]");if("object"==typeof o&&"[object Object]"===X(o)&&(o="[object Object]"),o=String(o),null===t&&(t={}),"tag:yaml.org,2002:merge"===n)if(Array.isArray(a))for(l=0,d=a.length;l<d;l+=1)ve(e,t,a[l],i);else ve(e,t,a,i);else e.json||H.call(i,o)||!H.call(t,o)||(e.line=r||e.line,e.lineStart=s||e.lineStart,e.position=c||e.position,_e(e,"duplicated mapping key")),le(t,o,a),delete i[o];return t}function xe(e){var t;10===(t=e.input.charCodeAt(e.position))?e.position++:13===t?(e.position++,10===e.input.charCodeAt(e.position)&&e.position++):_e(e,"a line break is expected"),e.line+=1,e.lineStart=e.position,e.firstTabInLine=-1}function we(e,t,i){for(var n=0,o=e.input.charCodeAt(e.position);0!==o;){for(;te(o);)9===o&&-1===e.firstTabInLine&&(e.firstTabInLine=e.position),o=e.input.charCodeAt(++e.position);if(t&&35===o)do{o=e.input.charCodeAt(++e.position)}while(10!==o&&13!==o&&0!==o);if(!ee(o))break;for(xe(e),o=e.input.charCodeAt(e.position),n++,e.lineIndent=0;32===o;)e.lineIndent++,o=e.input.charCodeAt(++e.position)}return-1!==i&&0!==n&&e.lineIndent<i&&me(e,"deficient indentation"),n}function $e(e){var t,i=e.position;return!(45!==(t=e.input.charCodeAt(i))&&46!==t||t!==e.input.charCodeAt(i+1)||t!==e.input.charCodeAt(i+2)||(i+=3,0!==(t=e.input.charCodeAt(i))&&!ie(t)))}function Ce(e,t){1===t?e.result+=" ":t>1&&(e.result+=r.repeat("\n",t-1))}function ke(e,t){var i,n,o=e.tag,a=e.anchor,r=[],s=!1;if(-1!==e.firstTabInLine)return!1;for(null!==e.anchor&&(e.anchorMap[e.anchor]=r),n=e.input.charCodeAt(e.position);0!==n&&(-1!==e.firstTabInLine&&(e.position=e.firstTabInLine,_e(e,"tab characters must not be used in indentation")),45===n)&&ie(e.input.charCodeAt(e.position+1));)if(s=!0,e.position++,we(e,!0,-1)&&e.lineIndent<=t)r.push(null),n=e.input.charCodeAt(e.position);else if(i=e.line,Ee(e,t,3,!1,!0),r.push(e.result),we(e,!0,-1),n=e.input.charCodeAt(e.position),(e.line===i||e.lineIndent>t)&&0!==n)_e(e,"bad indentation of a sequence entry");else if(e.lineIndent<t)break;return!!s&&(e.tag=o,e.anchor=a,e.kind="sequence",e.result=r,!0)}function Se(e){var t,i,n,o,a=!1,r=!1;if(33!==(o=e.input.charCodeAt(e.position)))return!1;if(null!==e.tag&&_e(e,"duplication of a tag property"),60===(o=e.input.charCodeAt(++e.position))?(a=!0,o=e.input.charCodeAt(++e.position)):33===o?(r=!0,i="!!",o=e.input.charCodeAt(++e.position)):i="!",t=e.position,a){do{o=e.input.charCodeAt(++e.position)}while(0!==o&&62!==o);e.position<e.length?(n=e.input.slice(t,e.position),o=e.input.charCodeAt(++e.position)):_e(e,"unexpected end of the stream within a verbatim tag")}else{for(;0!==o&&!ie(o);)33===o&&(r?_e(e,"tag suffix cannot contain exclamation marks"):(i=e.input.slice(t-1,e.position+1),Q.test(i)||_e(e,"named tag handle cannot contain such characters"),r=!0,t=e.position+1)),o=e.input.charCodeAt(++e.position);n=e.input.slice(t,e.position),Z.test(n)&&_e(e,"tag suffix cannot contain flow indicator characters")}n&&!J.test(n)&&_e(e,"tag name cannot contain such characters: "+n);try{n=decodeURIComponent(n)}catch(t){_e(e,"tag name is malformed: "+n)}return a?e.tag=n:H.call(e.tagMap,i)?e.tag=e.tagMap[i]+n:"!"===i?e.tag="!"+n:"!!"===i?e.tag="tag:yaml.org,2002:"+n:_e(e,'undeclared tag handle "'+i+'"'),!0}function Ae(e){var t,i;if(38!==(i=e.input.charCodeAt(e.position)))return!1;for(null!==e.anchor&&_e(e,"duplication of an anchor property"),i=e.input.charCodeAt(++e.position),t=e.position;0!==i&&!ie(i)&&!ne(i);)i=e.input.charCodeAt(++e.position);return e.position===t&&_e(e,"name of an anchor node must contain at least one character"),e.anchor=e.input.slice(t,e.position),!0}function Ee(e,t,i,n,o){var a,s,c,l,d,h,p,u,g,_=1,m=!1,f=!1;if(null!==e.listener&&e.listener("open",e),e.tag=null,e.anchor=null,e.kind=null,e.result=null,a=s=c=4===i||3===i,n&&we(e,!0,-1)&&(m=!0,e.lineIndent>t?_=1:e.lineIndent===t?_=0:e.lineIndent<t&&(_=-1)),1===_)for(;Se(e)||Ae(e);)we(e,!0,-1)?(m=!0,c=a,e.lineIndent>t?_=1:e.lineIndent===t?_=0:e.lineIndent<t&&(_=-1)):c=!1;if(c&&(c=m||o),1!==_&&4!==i||(u=1===i||2===i?t:t+1,g=e.position-e.lineStart,1===_?c&&(ke(e,g)||function(e,t,i){var n,o,a,r,s,c,l,d=e.tag,h=e.anchor,p={},u=Object.create(null),g=null,_=null,m=null,f=!1,y=!1;if(-1!==e.firstTabInLine)return!1;for(null!==e.anchor&&(e.anchorMap[e.anchor]=p),l=e.input.charCodeAt(e.position);0!==l;){if(f||-1===e.firstTabInLine||(e.position=e.firstTabInLine,_e(e,"tab characters must not be used in indentation")),n=e.input.charCodeAt(e.position+1),a=e.line,63!==l&&58!==l||!ie(n)){if(r=e.line,s=e.lineStart,c=e.position,!Ee(e,i,2,!1,!0))break;if(e.line===a){for(l=e.input.charCodeAt(e.position);te(l);)l=e.input.charCodeAt(++e.position);if(58===l)ie(l=e.input.charCodeAt(++e.position))||_e(e,"a whitespace character is expected after the key-value separator within a block mapping"),f&&(be(e,p,u,g,_,null,r,s,c),g=_=m=null),y=!0,f=!1,o=!1,g=e.tag,_=e.result;else{if(!y)return e.tag=d,e.anchor=h,!0;_e(e,"can not read an implicit mapping pair; a colon is missed")}}else{if(!y)return e.tag=d,e.anchor=h,!0;_e(e,"can not read a block mapping entry; a multiline key may not be an implicit key")}}else 63===l?(f&&(be(e,p,u,g,_,null,r,s,c),g=_=m=null),y=!0,f=!0,o=!0):f?(f=!1,o=!0):_e(e,"incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line"),e.position+=1,l=n;if((e.line===a||e.lineIndent>t)&&(f&&(r=e.line,s=e.lineStart,c=e.position),Ee(e,t,4,!0,o)&&(f?_=e.result:m=e.result),f||(be(e,p,u,g,_,m,r,s,c),g=_=m=null),we(e,!0,-1),l=e.input.charCodeAt(e.position)),(e.line===a||e.lineIndent>t)&&0!==l)_e(e,"bad indentation of a mapping entry");else if(e.lineIndent<t)break}return f&&be(e,p,u,g,_,null,r,s,c),y&&(e.tag=d,e.anchor=h,e.kind="mapping",e.result=p),y}(e,g,u))||function(e,t){var i,n,o,a,r,s,c,l,d,h,p,u,g=!0,_=e.tag,m=e.anchor,f=Object.create(null);if(91===(u=e.input.charCodeAt(e.position)))r=93,l=!1,a=[];else{if(123!==u)return!1;r=125,l=!0,a={}}for(null!==e.anchor&&(e.anchorMap[e.anchor]=a),u=e.input.charCodeAt(++e.position);0!==u;){if(we(e,!0,t),(u=e.input.charCodeAt(e.position))===r)return e.position++,e.tag=_,e.anchor=m,e.kind=l?"mapping":"sequence",e.result=a,!0;g?44===u&&_e(e,"expected the node content, but found ','"):_e(e,"missed comma between flow collection entries"),p=null,s=c=!1,63===u&&ie(e.input.charCodeAt(e.position+1))&&(s=c=!0,e.position++,we(e,!0,t)),i=e.line,n=e.lineStart,o=e.position,Ee(e,t,1,!1,!0),h=e.tag,d=e.result,we(e,!0,t),u=e.input.charCodeAt(e.position),!c&&e.line!==i||58!==u||(s=!0,u=e.input.charCodeAt(++e.position),we(e,!0,t),Ee(e,t,1,!1,!0),p=e.result),l?be(e,a,f,h,d,p,i,n,o):s?a.push(be(e,null,f,h,d,p,i,n,o)):a.push(d),we(e,!0,t),44===(u=e.input.charCodeAt(e.position))?(g=!0,u=e.input.charCodeAt(++e.position)):g=!1}_e(e,"unexpected end of the stream within a flow collection")}(e,u)?f=!0:(s&&function(e,t){var i,n,o,a,s=1,c=!1,l=!1,d=t,h=0,p=!1;if(124===(a=e.input.charCodeAt(e.position)))n=!1;else{if(62!==a)return!1;n=!0}for(e.kind="scalar",e.result="";0!==a;)if(43===(a=e.input.charCodeAt(++e.position))||45===a)1===s?s=43===a?3:2:_e(e,"repeat of a chomping mode identifier");else{if(!((o=re(a))>=0))break;0===o?_e(e,"bad explicit indentation width of a block scalar; it cannot be less than one"):l?_e(e,"repeat of an indentation width identifier"):(d=t+o-1,l=!0)}if(te(a)){do{a=e.input.charCodeAt(++e.position)}while(te(a));if(35===a)do{a=e.input.charCodeAt(++e.position)}while(!ee(a)&&0!==a)}for(;0!==a;){for(xe(e),e.lineIndent=0,a=e.input.charCodeAt(e.position);(!l||e.lineIndent<d)&&32===a;)e.lineIndent++,a=e.input.charCodeAt(++e.position);if(!l&&e.lineIndent>d&&(d=e.lineIndent),ee(a))h++;else{if(e.lineIndent<d){3===s?e.result+=r.repeat("\n",c?1+h:h):1===s&&c&&(e.result+="\n");break}for(n?te(a)?(p=!0,e.result+=r.repeat("\n",c?1+h:h)):p?(p=!1,e.result+=r.repeat("\n",h+1)):0===h?c&&(e.result+=" "):e.result+=r.repeat("\n",h):e.result+=r.repeat("\n",c?1+h:h),c=!0,l=!0,h=0,i=e.position;!ee(a)&&0!==a;)a=e.input.charCodeAt(++e.position);ye(e,i,e.position,!1)}}return!0}(e,u)||function(e,t){var i,n,o;if(39!==(i=e.input.charCodeAt(e.position)))return!1;for(e.kind="scalar",e.result="",e.position++,n=o=e.position;0!==(i=e.input.charCodeAt(e.position));)if(39===i){if(ye(e,n,e.position,!0),39!==(i=e.input.charCodeAt(++e.position)))return!0;n=e.position,e.position++,o=e.position}else ee(i)?(ye(e,n,o,!0),Ce(e,we(e,!1,t)),n=o=e.position):e.position===e.lineStart&&$e(e)?_e(e,"unexpected end of the document within a single quoted scalar"):(e.position++,o=e.position);_e(e,"unexpected end of the stream within a single quoted scalar")}(e,u)||function(e,t){var i,n,o,a,r,s;if(34!==(s=e.input.charCodeAt(e.position)))return!1;for(e.kind="scalar",e.result="",e.position++,i=n=e.position;0!==(s=e.input.charCodeAt(e.position));){if(34===s)return ye(e,i,e.position,!0),e.position++,!0;if(92===s){if(ye(e,i,e.position,!0),ee(s=e.input.charCodeAt(++e.position)))we(e,!1,t);else if(s<256&&de[s])e.result+=he[s],e.position++;else if((r=ae(s))>0){for(o=r,a=0;o>0;o--)(r=oe(s=e.input.charCodeAt(++e.position)))>=0?a=(a<<4)+r:_e(e,"expected hexadecimal character");e.result+=ce(a),e.position++}else _e(e,"unknown escape sequence");i=n=e.position}else ee(s)?(ye(e,i,n,!0),Ce(e,we(e,!1,t)),i=n=e.position):e.position===e.lineStart&&$e(e)?_e(e,"unexpected end of the document within a double quoted scalar"):(e.position++,n=e.position)}_e(e,"unexpected end of the stream within a double quoted scalar")}(e,u)?f=!0:function(e){var t,i,n;if(42!==(n=e.input.charCodeAt(e.position)))return!1;for(n=e.input.charCodeAt(++e.position),t=e.position;0!==n&&!ie(n)&&!ne(n);)n=e.input.charCodeAt(++e.position);return e.position===t&&_e(e,"name of an alias node must contain at least one character"),i=e.input.slice(t,e.position),H.call(e.anchorMap,i)||_e(e,'unidentified alias "'+i+'"'),e.result=e.anchorMap[i],we(e,!0,-1),!0}(e)?(f=!0,null===e.tag&&null===e.anchor||_e(e,"alias node should not have any properties")):function(e,t,i){var n,o,a,r,s,c,l,d,h=e.kind,p=e.result;if(ie(d=e.input.charCodeAt(e.position))||ne(d)||35===d||38===d||42===d||33===d||124===d||62===d||39===d||34===d||37===d||64===d||96===d)return!1;if((63===d||45===d)&&(ie(n=e.input.charCodeAt(e.position+1))||i&&ne(n)))return!1;for(e.kind="scalar",e.result="",o=a=e.position,r=!1;0!==d;){if(58===d){if(ie(n=e.input.charCodeAt(e.position+1))||i&&ne(n))break}else if(35===d){if(ie(e.input.charCodeAt(e.position-1)))break}else{if(e.position===e.lineStart&&$e(e)||i&&ne(d))break;if(ee(d)){if(s=e.line,c=e.lineStart,l=e.lineIndent,we(e,!1,-1),e.lineIndent>=t){r=!0,d=e.input.charCodeAt(e.position);continue}e.position=a,e.line=s,e.lineStart=c,e.lineIndent=l;break}}r&&(ye(e,o,a,!1),Ce(e,e.line-s),o=a=e.position,r=!1),te(d)||(a=e.position+1),d=e.input.charCodeAt(++e.position)}return ye(e,o,a,!1),!!e.result||(e.kind=h,e.result=p,!1)}(e,u,1===i)&&(f=!0,null===e.tag&&(e.tag="?")),null!==e.anchor&&(e.anchorMap[e.anchor]=e.result)):0===_&&(f=c&&ke(e,g))),null===e.tag)null!==e.anchor&&(e.anchorMap[e.anchor]=e.result);else if("?"===e.tag){for(null!==e.result&&"scalar"!==e.kind&&_e(e,'unacceptable node kind for !<?> tag; it should be "scalar", not "'+e.kind+'"'),l=0,d=e.implicitTypes.length;l<d;l+=1)if((p=e.implicitTypes[l]).resolve(e.result)){e.result=p.construct(e.result),e.tag=p.tag,null!==e.anchor&&(e.anchorMap[e.anchor]=e.result);break}}else if("!"!==e.tag){if(H.call(e.typeMap[e.kind||"fallback"],e.tag))p=e.typeMap[e.kind||"fallback"][e.tag];else for(p=null,l=0,d=(h=e.typeMap.multi[e.kind||"fallback"]).length;l<d;l+=1)if(e.tag.slice(0,h[l].tag.length)===h[l].tag){p=h[l];break}p||_e(e,"unknown tag !<"+e.tag+">"),null!==e.result&&p.kind!==e.kind&&_e(e,"unacceptable node kind for !<"+e.tag+'> tag; it should be "'+p.kind+'", not "'+e.kind+'"'),p.resolve(e.result,e.tag)?(e.result=p.construct(e.result,e.tag),null!==e.anchor&&(e.anchorMap[e.anchor]=e.result)):_e(e,"cannot resolve a node with !<"+e.tag+"> explicit tag")}return null!==e.listener&&e.listener("close",e),null!==e.tag||null!==e.anchor||f}function ze(e){var t,i,n,o,a=e.position,r=!1;for(e.version=null,e.checkLineBreaks=e.legacy,e.tagMap=Object.create(null),e.anchorMap=Object.create(null);0!==(o=e.input.charCodeAt(e.position))&&(we(e,!0,-1),o=e.input.charCodeAt(e.position),!(e.lineIndent>0||37!==o));){for(r=!0,o=e.input.charCodeAt(++e.position),t=e.position;0!==o&&!ie(o);)o=e.input.charCodeAt(++e.position);for(n=[],(i=e.input.slice(t,e.position)).length<1&&_e(e,"directive name must not be less than one character in length");0!==o;){for(;te(o);)o=e.input.charCodeAt(++e.position);if(35===o){do{o=e.input.charCodeAt(++e.position)}while(0!==o&&!ee(o));break}if(ee(o))break;for(t=e.position;0!==o&&!ie(o);)o=e.input.charCodeAt(++e.position);n.push(e.input.slice(t,e.position))}0!==o&&xe(e),H.call(fe,i)?fe[i](e,i,n):me(e,'unknown document directive "'+i+'"')}we(e,!0,-1),0===e.lineIndent&&45===e.input.charCodeAt(e.position)&&45===e.input.charCodeAt(e.position+1)&&45===e.input.charCodeAt(e.position+2)?(e.position+=3,we(e,!0,-1)):r&&_e(e,"directives end mark is expected"),Ee(e,e.lineIndent-1,4,!1,!0),we(e,!0,-1),e.checkLineBreaks&&G.test(e.input.slice(a,e.position))&&me(e,"non-ASCII line breaks are interpreted as content"),e.documents.push(e.result),e.position===e.lineStart&&$e(e)?46===e.input.charCodeAt(e.position)&&(e.position+=3,we(e,!0,-1)):e.position<e.length-1&&_e(e,"end of the stream or a document separator is expected")}function Oe(e,t){t=t||{},0!==(e=String(e)).length&&(10!==e.charCodeAt(e.length-1)&&13!==e.charCodeAt(e.length-1)&&(e+="\n"),65279===e.charCodeAt(0)&&(e=e.slice(1)));var i=new ue(e,t),n=e.indexOf("\0");for(-1!==n&&(i.position=n,_e(i,"null byte is not allowed in input")),i.input+="\0";32===i.input.charCodeAt(i.position);)i.lineIndent+=1,i.position+=1;for(;i.position<i.length-1;)ze(i);return i.documents}var qe={loadAll:function(e,t,i){null!==t&&"object"==typeof t&&void 0===i&&(i=t,t=null);var n=Oe(e,i);if("function"!=typeof t)return n;for(var o=0,a=n.length;o<a;o+=1)t(n[o])},load:function(e,t){var i=Oe(e,t);if(0!==i.length){if(1===i.length)return i[0];throw new l("expected a single document in the stream, but found more")}}},De=Object.prototype.toString,Te=Object.prototype.hasOwnProperty,Ie=65279,Fe={0:"\\0",7:"\\a",8:"\\b",9:"\\t",10:"\\n",11:"\\v",12:"\\f",13:"\\r",27:"\\e",34:'\\"',92:"\\\\",133:"\\N",160:"\\_",8232:"\\L",8233:"\\P"},je=["y","Y","yes","Yes","YES","on","On","ON","n","N","no","No","NO","off","Off","OFF"],Le=/^[-+]?[0-9_]+(?::[0-9_]+)+(?:\.[0-9_]*)?$/;function Me(e){var t,i,n;if(t=e.toString(16).toUpperCase(),e<=255)i="x",n=2;else if(e<=65535)i="u",n=4;else{if(!(e<=4294967295))throw new l("code point within a string may not be greater than 0xFFFFFFFF");i="U",n=8}return"\\"+i+r.repeat("0",n-t.length)+t}function Ne(e){this.schema=e.schema||W,this.indent=Math.max(1,e.indent||2),this.noArrayIndent=e.noArrayIndent||!1,this.skipInvalid=e.skipInvalid||!1,this.flowLevel=r.isNothing(e.flowLevel)?-1:e.flowLevel,this.styleMap=function(e,t){var i,n,o,a,r,s,c;if(null===t)return{};for(i={},o=0,a=(n=Object.keys(t)).length;o<a;o+=1)r=n[o],s=String(t[r]),"!!"===r.slice(0,2)&&(r="tag:yaml.org,2002:"+r.slice(2)),(c=e.compiledTypeMap.fallback[r])&&Te.call(c.styleAliases,s)&&(s=c.styleAliases[s]),i[r]=s;return i}(this.schema,e.styles||null),this.sortKeys=e.sortKeys||!1,this.lineWidth=e.lineWidth||80,this.noRefs=e.noRefs||!1,this.noCompatMode=e.noCompatMode||!1,this.condenseFlow=e.condenseFlow||!1,this.quotingType='"'===e.quotingType?2:1,this.forceQuotes=e.forceQuotes||!1,this.replacer="function"==typeof e.replacer?e.replacer:null,this.implicitTypes=this.schema.compiledImplicit,this.explicitTypes=this.schema.compiledExplicit,this.tag=null,this.result="",this.duplicates=[],this.usedDuplicates=null}function Ue(e,t){for(var i,n=r.repeat(" ",t),o=0,a=-1,s="",c=e.length;o<c;)-1===(a=e.indexOf("\n",o))?(i=e.slice(o),o=c):(i=e.slice(o,a+1),o=a+1),i.length&&"\n"!==i&&(s+=n),s+=i;return s}function Pe(e,t){return"\n"+r.repeat(" ",e.indent*t)}function Re(e){return 32===e||9===e}function Ve(e){return 32<=e&&e<=126||161<=e&&e<=55295&&8232!==e&&8233!==e||57344<=e&&e<=65533&&e!==Ie||65536<=e&&e<=1114111}function Ye(e){return Ve(e)&&e!==Ie&&13!==e&&10!==e}function Be(e,t,i){var n=Ye(e),o=n&&!Re(e);return(i?n:n&&44!==e&&91!==e&&93!==e&&123!==e&&125!==e)&&35!==e&&!(58===t&&!o)||Ye(t)&&!Re(t)&&35===e||58===t&&o}function We(e,t){var i,n=e.charCodeAt(t);return n>=55296&&n<=56319&&t+1<e.length&&(i=e.charCodeAt(t+1))>=56320&&i<=57343?1024*(n-55296)+i-56320+65536:n}function He(e){return/^\n* /.test(e)}function Ke(e,t,i,n,o){e.dump=function(){if(0===t.length)return 2===e.quotingType?'""':"''";if(!e.noCompatMode&&(-1!==je.indexOf(t)||Le.test(t)))return 2===e.quotingType?'"'+t+'"':"'"+t+"'";var a=e.indent*Math.max(1,i),r=-1===e.lineWidth?-1:Math.max(Math.min(e.lineWidth,40),e.lineWidth-a),s=n||e.flowLevel>-1&&i>=e.flowLevel;switch(function(e,t,i,n,o,a,r,s){var c,l,d=0,h=null,p=!1,u=!1,g=-1!==n,_=-1,m=Ve(l=We(e,0))&&l!==Ie&&!Re(l)&&45!==l&&63!==l&&58!==l&&44!==l&&91!==l&&93!==l&&123!==l&&125!==l&&35!==l&&38!==l&&42!==l&&33!==l&&124!==l&&61!==l&&62!==l&&39!==l&&34!==l&&37!==l&&64!==l&&96!==l&&function(e){return!Re(e)&&58!==e}(We(e,e.length-1));if(t||r)for(c=0;c<e.length;d>=65536?c+=2:c++){if(!Ve(d=We(e,c)))return 5;m=m&&Be(d,h,s),h=d}else{for(c=0;c<e.length;d>=65536?c+=2:c++){if(10===(d=We(e,c)))p=!0,g&&(u=u||c-_-1>n&&" "!==e[_+1],_=c);else if(!Ve(d))return 5;m=m&&Be(d,h,s),h=d}u=u||g&&c-_-1>n&&" "!==e[_+1]}return p||u?i>9&&He(e)?5:r?2===a?5:2:u?4:3:!m||r||o(e)?2===a?5:2:1}(t,s,e.indent,r,function(t){return function(e,t){var i,n;for(i=0,n=e.implicitTypes.length;i<n;i+=1)if(e.implicitTypes[i].resolve(t))return!0;return!1}(e,t)},e.quotingType,e.forceQuotes&&!n,o)){case 1:return t;case 2:return"'"+t.replace(/'/g,"''")+"'";case 3:return"|"+Ge(t,e.indent)+Ze(Ue(t,a));case 4:return">"+Ge(t,e.indent)+Ze(Ue(function(e,t){for(var i,n,o,a=/(\n+)([^\n]*)/g,r=(o=-1!==(o=e.indexOf("\n"))?o:e.length,a.lastIndex=o,Qe(e.slice(0,o),t)),s="\n"===e[0]||" "===e[0];n=a.exec(e);){var c=n[1],l=n[2];i=" "===l[0],r+=c+(s||i||""===l?"":"\n")+Qe(l,t),s=i}return r}(t,r),a));case 5:return'"'+function(e){for(var t,i="",n=0,o=0;o<e.length;n>=65536?o+=2:o++)n=We(e,o),!(t=Fe[n])&&Ve(n)?(i+=e[o],n>=65536&&(i+=e[o+1])):i+=t||Me(n);return i}(t)+'"';default:throw new l("impossible error: invalid scalar style")}}()}function Ge(e,t){var i=He(e)?String(t):"",n="\n"===e[e.length-1];return i+(!n||"\n"!==e[e.length-2]&&"\n"!==e?n?"":"-":"+")+"\n"}function Ze(e){return"\n"===e[e.length-1]?e.slice(0,-1):e}function Qe(e,t){if(""===e||" "===e[0])return e;for(var i,n,o=/ [^ ]/g,a=0,r=0,s=0,c="";i=o.exec(e);)(s=i.index)-a>t&&(n=r>a?r:s,c+="\n"+e.slice(a,n),a=n+1),r=s;return c+="\n",e.length-a>t&&r>a?c+=e.slice(a,r)+"\n"+e.slice(r+1):c+=e.slice(a),c.slice(1)}function Je(e,t,i,n){var o,a,r,s="",c=e.tag;for(o=0,a=i.length;o<a;o+=1)r=i[o],e.replacer&&(r=e.replacer.call(i,String(o),r)),(et(e,t+1,r,!0,!0,!1,!0)||void 0===r&&et(e,t+1,null,!0,!0,!1,!0))&&(n&&""===s||(s+=Pe(e,t)),e.dump&&10===e.dump.charCodeAt(0)?s+="-":s+="- ",s+=e.dump);e.tag=c,e.dump=s||"[]"}function Xe(e,t,i){var n,o,a,r,s,c;for(a=0,r=(o=i?e.explicitTypes:e.implicitTypes).length;a<r;a+=1)if(((s=o[a]).instanceOf||s.predicate)&&(!s.instanceOf||"object"==typeof t&&t instanceof s.instanceOf)&&(!s.predicate||s.predicate(t))){if(i?s.multi&&s.representName?e.tag=s.representName(t):e.tag=s.tag:e.tag="?",s.represent){if(c=e.styleMap[s.tag]||s.defaultStyle,"[object Function]"===De.call(s.represent))n=s.represent(t,c);else{if(!Te.call(s.represent,c))throw new l("!<"+s.tag+'> tag resolver accepts not "'+c+'" style');n=s.represent[c](t,c)}e.dump=n}return!0}return!1}function et(e,t,i,n,o,a,r){e.tag=null,e.dump=i,Xe(e,i,!1)||Xe(e,i,!0);var s,c=De.call(e.dump),d=n;n&&(n=e.flowLevel<0||e.flowLevel>t);var h,p,u="[object Object]"===c||"[object Array]"===c;if(u&&(p=-1!==(h=e.duplicates.indexOf(i))),(null!==e.tag&&"?"!==e.tag||p||2!==e.indent&&t>0)&&(o=!1),p&&e.usedDuplicates[h])e.dump="*ref_"+h;else{if(u&&p&&!e.usedDuplicates[h]&&(e.usedDuplicates[h]=!0),"[object Object]"===c)n&&0!==Object.keys(e.dump).length?(function(e,t,i,n){var o,a,r,s,c,d,h="",p=e.tag,u=Object.keys(i);if(!0===e.sortKeys)u.sort();else if("function"==typeof e.sortKeys)u.sort(e.sortKeys);else if(e.sortKeys)throw new l("sortKeys must be a boolean or a function");for(o=0,a=u.length;o<a;o+=1)d="",n&&""===h||(d+=Pe(e,t)),s=i[r=u[o]],e.replacer&&(s=e.replacer.call(i,r,s)),et(e,t+1,r,!0,!0,!0)&&((c=null!==e.tag&&"?"!==e.tag||e.dump&&e.dump.length>1024)&&(e.dump&&10===e.dump.charCodeAt(0)?d+="?":d+="? "),d+=e.dump,c&&(d+=Pe(e,t)),et(e,t+1,s,!0,c)&&(e.dump&&10===e.dump.charCodeAt(0)?d+=":":d+=": ",h+=d+=e.dump));e.tag=p,e.dump=h||"{}"}(e,t,e.dump,o),p&&(e.dump="&ref_"+h+e.dump)):(function(e,t,i){var n,o,a,r,s,c="",l=e.tag,d=Object.keys(i);for(n=0,o=d.length;n<o;n+=1)s="",""!==c&&(s+=", "),e.condenseFlow&&(s+='"'),r=i[a=d[n]],e.replacer&&(r=e.replacer.call(i,a,r)),et(e,t,a,!1,!1)&&(e.dump.length>1024&&(s+="? "),s+=e.dump+(e.condenseFlow?'"':"")+":"+(e.condenseFlow?"":" "),et(e,t,r,!1,!1)&&(c+=s+=e.dump));e.tag=l,e.dump="{"+c+"}"}(e,t,e.dump),p&&(e.dump="&ref_"+h+" "+e.dump));else if("[object Array]"===c)n&&0!==e.dump.length?(e.noArrayIndent&&!r&&t>0?Je(e,t-1,e.dump,o):Je(e,t,e.dump,o),p&&(e.dump="&ref_"+h+e.dump)):(function(e,t,i){var n,o,a,r="",s=e.tag;for(n=0,o=i.length;n<o;n+=1)a=i[n],e.replacer&&(a=e.replacer.call(i,String(n),a)),(et(e,t,a,!1,!1)||void 0===a&&et(e,t,null,!1,!1))&&(""!==r&&(r+=","+(e.condenseFlow?"":" ")),r+=e.dump);e.tag=s,e.dump="["+r+"]"}(e,t,e.dump),p&&(e.dump="&ref_"+h+" "+e.dump));else{if("[object String]"!==c){if("[object Undefined]"===c)return!1;if(e.skipInvalid)return!1;throw new l("unacceptable kind of an object to dump "+c)}"?"!==e.tag&&Ke(e,e.dump,t,a,d)}null!==e.tag&&"?"!==e.tag&&(s=encodeURI("!"===e.tag[0]?e.tag.slice(1):e.tag).replace(/!/g,"%21"),s="!"===e.tag[0]?"!"+s:"tag:yaml.org,2002:"===s.slice(0,18)?"!!"+s.slice(18):"!<"+s+">",e.dump=s+" "+e.dump)}return!0}function tt(e,t){var i,n,o=[],a=[];for(it(e,o,a),i=0,n=a.length;i<n;i+=1)t.duplicates.push(o[a[i]]);t.usedDuplicates=new Array(n)}function it(e,t,i){var n,o,a;if(null!==e&&"object"==typeof e)if(-1!==(o=t.indexOf(e)))-1===i.indexOf(o)&&i.push(o);else if(t.push(e),Array.isArray(e))for(o=0,a=e.length;o<a;o+=1)it(e[o],t,i);else for(o=0,a=(n=Object.keys(e)).length;o<a;o+=1)it(e[n[o]],t,i)}function nt(e,t){return function(){throw new Error("Function yaml."+e+" is removed in js-yaml 4. Use yaml."+t+" instead, which is now safe by default.")}}var ot={Type:g,Schema:f,FAILSAFE_SCHEMA:x,JSON_SCHEMA:q,CORE_SCHEMA:D,DEFAULT_SCHEMA:W,load:qe.load,loadAll:qe.loadAll,dump:function(e,t){var i=new Ne(t=t||{});i.noRefs||tt(e,i);var n=e;return i.replacer&&(n=i.replacer.call({"":n},"",n)),et(i,0,n,!0,!0)?i.dump+"\n":""},YAMLException:l,types:{binary:M,float:O,map:b,null:w,pairs:V,set:B,timestamp:F,bool:$,int:A,merge:j,omap:P,seq:v,str:y},safeLoad:nt("safeLoad","load"),safeLoadAll:nt("safeLoadAll","loadAll"),safeDump:nt("safeDump","dump")},at=i(217),rt=i(475),st=i(113);const ct=[{name:"show_summary_views",selector:{boolean:{}}},{name:"show_room_views",selector:{boolean:{}}}];const lt=[{name:"summaries_columns",selector:{select:{mode:"box",options:[{value:2,label:(0,rt.localize)("editor.columns_2")},{value:4,label:(0,rt.localize)("editor.columns_4")}]}}},{name:"show_light_summary",selector:{boolean:{}}},{name:"group_lights_by_floors",selector:{boolean:{}}},{name:"nested_light_groups",selector:{boolean:{}}},{name:"lights_sort_by",selector:{select:{mode:"list",options:[{value:"last_changed",label:(0,rt.localize)("editor.lights_sort_by_last_changed")},{value:"name",label:(0,rt.localize)("editor.lights_sort_by_name")}]}}},{name:"show_covers_summary",selector:{boolean:{}}},{name:"show_partially_open_covers",selector:{boolean:{}}},{name:"group_covers_by_floors",selector:{boolean:{}}},{name:"show_security_summary",selector:{boolean:{}}},{name:"show_climate_summary",selector:{boolean:{}}},{name:"show_battery_summary",selector:{boolean:{}}},{name:"hide_mobile_app_batteries",selector:{boolean:{}}},{name:"show_area_in_battery_view",selector:{boolean:{}}},{name:"hide_battery_notes_entities",selector:{boolean:{}}},{name:"battery_critical_threshold",selector:{number:{min:1,max:99,step:1,unit_of_measurement:"%",mode:"box"}}},{name:"battery_low_threshold",selector:{number:{min:1,max:99,step:1,unit_of_measurement:"%",mode:"box"}}},{name:"unavailable_batteries_bucket",selector:{select:{mode:"list",options:[{value:"critical",label:(0,rt.localize)("editor.unavailable_batteries_critical")},{value:"good",label:(0,rt.localize)("editor.unavailable_batteries_good")}]}}}],dt=["overview","summaries","favorites","custom_cards","areas","areas_other","weather","energy"],ht=["show_unavailable_alert_badge","show_now_playing_badge","show_sun_badge","show_updates_badge"];function pt(e){return n.qy`
    <div class="section">
      <div class="section-title">${(0,rt.localize)("editor.section_order")}</div>
      <div class="description" style="margin-left: 0; margin-bottom: 12px;">
        ${(0,rt.localize)("editor.section_order_desc")}
      </div>
      <div class="section-order-list" id="section-order-list">
        ${e.order.map(t=>function(e,t){const i=e.sectionMeta.get(t);if(!i)return n.s6;const o=e.isSectionDisabled(t),a=e.isSectionToggleable(t);return n.qy`
    <div
      class="section-order-item ${o?"disabled":""}"
      data-section-key=${t}
      draggable="true"
      @dragstart=${e.onDragStart}
      @dragend=${e.onDragEnd}
      @dragover=${e.onDragOver}
      @dragleave=${e.onDragLeave}
      @drop=${e.onDrop}
    >
      <span class="drag-handle" draggable="true">&#x2630;</span>
      <ha-icon class="section-icon" icon=${i.icon}></ha-icon>
      <span class="section-label">${(0,rt.localize)(i.labelKey)}</span>
      ${o&&!a?n.qy`<span class="section-hidden-tag">(${(0,rt.localize)("editor.section_hidden")})</span>`:n.s6}
      ${a?n.qy`
            <label
              class="section-toggle"
              @mousedown=${e=>{e.stopPropagation()}}
            >
              <input
                type="checkbox"
                ?checked=${!o}
                @change=${i=>{e.onToggleSectionVisibility(t,i.target.checked)}}
                @dragstart=${e=>{e.stopPropagation()}}
              />
            </label>
          `:n.s6}
    </div>
    ${function(e,t){if("weather"!==t)return n.s6;if(!1===e.config.show_weather)return n.s6;const i=e.config.weather_presentation??(!1===e.config.show_weather_forecast_card?"none":"forecast_daily"),o=e.config.weather_entity||"",a=n.qy`
    <div class="section-order-sub" style="flex-wrap: wrap;">
      <label for="weather-presentation">${(0,rt.localize)("editor.weather_presentation")}</label>
      <select
        id="weather-presentation"
        .value=${i}
        @change=${t=>e.onSetWeatherPresentation(t.target.value)}
      >
        ${["forecast_daily","forecast_hourly","forecast_twice_daily","tile","none"].map(e=>n.qy`
            <option value=${e} ?selected=${i===e}>
              ${(0,rt.localize)(`editor.weather_presentation_${e}`)}
            </option>
          `)}
      </select>
    </div>
  `,r=e.weatherEntities.length>1?n.qy`
          <div class="section-order-sub" style="flex-wrap: wrap;">
            <label for="weather-entity">${(0,rt.localize)("editor.weather_entity")}</label>
            <select
              id="weather-entity"
              .value=${o}
              @change=${e.onWeatherEntityChange}
            >
              <option value="" ?selected=${!o}>
                ${(0,rt.localize)("editor.weather_entity_auto")}
              </option>
              ${e.weatherEntities.map(e=>n.qy`
                  <option
                    value=${e.entity_id}
                    ?selected=${e.entity_id===o}
                  >
                    ${e.name}
                  </option>
                `)}
            </select>
          </div>
        `:n.s6;return n.qy`${a}${r}`}(e,t)} ${function(e,t){if("energy"!==t)return n.s6;if(!1===e.config.show_energy)return n.s6;const i=!1!==e.config.energy_link_dashboard,o=!1!==e.config.show_energy_distribution_card,a=e.config.power_badge_entity||"";return n.qy`
    <div class="section-order-sub">
      <input
        type="checkbox"
        id="energy-link-dashboard"
        ?checked=${i}
        @change=${t=>e.onToggleChange("energy_link_dashboard",t.target.checked,!0)}
      />
      <label for="energy-link-dashboard">${(0,rt.localize)("editor.energy_link_dashboard")}</label>
    </div>
    <div class="section-order-sub">
      <input
        type="checkbox"
        id="show-energy-distribution-card"
        ?checked=${o}
        @change=${t=>e.onToggleChange("show_energy_distribution_card",t.target.checked,!0)}
      />
      <label for="show-energy-distribution-card">
        ${(0,rt.localize)("editor.show_energy_distribution_card")}
      </label>
    </div>
    ${e.powerSensorEntities.length>0?n.qy`
          <div class="section-order-sub" style="display: block;">
            <label for="power-badge-entity" style="display: block; margin-bottom: 4px;">
              ${(0,rt.localize)("editor.power_badge_entity")}
            </label>
            <select
              id="power-badge-entity"
              style="width: 100%;"
              @change=${e.onPowerBadgeEntityChange}
            >
              <option value="" ?selected=${!a}>
                ${(0,rt.localize)("editor.power_badge_none")}
              </option>
              ${e.powerSensorEntities.map(e=>n.qy`
                  <option
                    value=${e.entity_id}
                    ?selected=${e.entity_id===a}
                  >
                    ${e.name}
                  </option>
                `)}
            </select>
            <div class="description">${(0,rt.localize)("editor.power_badge_entity_desc")}</div>
          </div>
        `:n.s6}
  `}(e,t)}
  `}(e,t))}
      </div>
      ${function(e){const t=new Set(e.config.hidden_section_headings||[]);return n.qy`
    <details style="margin-top: 12px;">
      <summary
        style="cursor: pointer; font-size: 13px; font-weight: 500; color: var(--primary-text-color); padding: 4px 0;"
      >
        ${(0,rt.localize)("editor.hide_section_headings")}
      </summary>
      <div style="margin-left: 14px; margin-top: 6px;">
        <div class="description" style="margin-left: 0; margin-bottom: 8px;">
          ${(0,rt.localize)("editor.hide_section_headings_desc")}
        </div>
        ${dt.map(i=>n.qy`
            <div class="form-row">
              <input
                type="checkbox"
                id="hide-heading-${i}"
                ?checked=${t.has(i)}
                @change=${t=>e.onToggleHiddenHeading(i,t.target.checked)}
              />
              <label for="hide-heading-${i}">${(0,rt.localize)(`editor.heading_label_${i}`)}</label>
            </div>
          `)}
      </div>
    </details>
  `}(e)} ${function(e){return n.qy`
    ${ht.map(t=>n.qy`
        <div style="margin-top: 12px;">
          <div class="form-row">
            <input
              type="checkbox"
              id=${t}
              ?checked=${!0===e.config[t]}
              @change=${i=>e.onToggleChange(t,i.target.checked,!1)}
            />
            <label for=${t}>${(0,rt.localize)(`editor.${t}`)}</label>
          </div>
          <div class="description">${(0,rt.localize)(`editor.${t}_desc`)}</div>
        </div>
      `)}
  `}(e)} ${function(e){return n.qy`
    <details style="margin-top: 12px;">
      <summary
        style="cursor: pointer; font-size: 13px; font-weight: 500; color: var(--primary-text-color); padding: 4px 0;"
      >
        ${(0,rt.localize)("editor.section_visibility")}
      </summary>
      <div style="margin-left: 14px; margin-top: 6px;">
        <div class="description" style="margin-left: 0; margin-bottom: 8px;">
          ${(0,rt.localize)("editor.section_visibility_desc")}
        </div>
        ${e.order.map(t=>{const i=e.sectionMeta.get(t);if(!i)return n.s6;const o=e.config.section_visibility?.[t];return n.qy`
            <div
              style="border: 1px solid var(--divider-color); border-radius: 6px; padding: 8px; margin-bottom: 8px;"
            >
              <div style="font-weight: 500; margin-bottom: 6px;">${(0,rt.localize)(i.labelKey)}</div>
              <div class="form-row">
                <label for="visibility-entity-${t}" style="min-width: 80px; font-size: 12px;">
                  ${(0,rt.localize)("editor.section_visibility_entity")}
                </label>
                <input
                  type="text"
                  id="visibility-entity-${t}"
                  style="flex: 1;"
                  placeholder="calendar.workday_sensor"
                  .value=${o?.entity||""}
                  @change=${i=>e.onSectionVisibilityChange(t,"entity",i.target.value)}
                />
              </div>
              <div class="form-row">
                <label for="visibility-state-${t}" style="min-width: 80px; font-size: 12px;">
                  ${(0,rt.localize)("editor.section_visibility_state")}
                </label>
                <input
                  type="text"
                  id="visibility-state-${t}"
                  style="flex: 1;"
                  placeholder="on"
                  .value=${o?.state||""}
                  @change=${i=>e.onSectionVisibilityChange(t,"state",i.target.value)}
                />
              </div>
            </div>
          `})}
      </div>
    </details>
  `}(e)}
    </div>
  `}class ut extends n.WF{constructor(){super(...arguments),this._hass=null,this._isUpdatingConfig=!1,this._config={},this._expandedAreas=new Set,this._expandedGroups=new Map,this._favoriteSearch="",this._roomPinSearch="",this._weatherSensorSearch="",this._securityExtraSearch="",this._lightFavSearch="",this._areaEntitiesCache=new Map,this._areaEntitiesCacheKey=null,this._draggedElement=null,this._sectionDraggedElement=null,this._handleSectionDragStart=e=>{if(!e.target.closest(".drag-handle"))return void e.preventDefault();const t=e.target.closest(".section-order-item");t?(t.classList.add("dragging"),e.dataTransfer&&(e.dataTransfer.effectAllowed="move",e.dataTransfer.setData("text/plain",t.dataset.sectionKey||"")),this._sectionDraggedElement=t):e.preventDefault()},this._handleSectionDragEnd=e=>{const t=e.target.closest(".section-order-item");t&&t.classList.remove("dragging");const i=this.shadowRoot?.querySelector("#section-order-list");i&&i.querySelectorAll(".section-order-item").forEach(e=>{e.classList.remove("drag-over")}),this._sectionDraggedElement=null},this._handleSectionDragOver=e=>{e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move");const t=e.currentTarget;t!==this._sectionDraggedElement&&t.classList.add("drag-over")},this._handleSectionDragLeave=e=>{e.currentTarget.classList.remove("drag-over")},this._handleSectionDrop=e=>{e.stopPropagation(),e.preventDefault();const t=e.currentTarget;if(t.classList.remove("drag-over"),!this._sectionDraggedElement||this._sectionDraggedElement===t)return;const i=this._sectionDraggedElement.dataset.sectionKey,n=t.dataset.sectionKey;if(!i||!n)return;const o=this._getSectionsOrder(),a=o.indexOf(i),r=o.indexOf(n);if(-1===a||-1===r)return;const s=[...o];s.splice(a,1),s.splice(r,0,i),this._updateSectionsOrder(s)},this._powerBadgeEntityChanged=e=>{const t=e.target.value,i={...this._config};t?i.power_badge_entity=t:delete i.power_badge_entity,this._fireConfigChanged(i)},this._handleDragStart=e=>{if(!e.target.closest(".drag-handle"))return void e.preventDefault();const t=e.target.closest(".area-item");t?(t.classList.add("dragging"),e.dataTransfer&&(e.dataTransfer.effectAllowed="move",e.dataTransfer.setData("text/plain",t.dataset.areaId||"")),this._draggedElement=t):e.preventDefault()},this._handleDragEnd=e=>{const t=e.target.closest(".area-item");t&&t.classList.remove("dragging");const i=this.shadowRoot.querySelector("#area-list");i&&i.querySelectorAll(".area-item").forEach(e=>{e.classList.remove("drag-over")})},this._handleDragOver=e=>{e.preventDefault(),e.dataTransfer.dropEffect="move";const t=e.currentTarget;t!==this._draggedElement&&t.classList.add("drag-over")},this._handleDragLeave=e=>{e.currentTarget.classList.remove("drag-over")},this._handleDrop=e=>{e.stopPropagation(),e.preventDefault();const t=e.currentTarget;if(t.classList.remove("drag-over"),!this._draggedElement||this._draggedElement===t)return;const i=this._draggedElement.dataset.areaId,n=t.dataset.areaId;if(!i||!n)return;const o=this._getAreaOrder(),a=o.indexOf(i),r=o.indexOf(n);if(-1===a||-1===r)return;const s=[...o];s.splice(a,1),s.splice(r,0,i),this._updateAreaOrder(s)},this._entityDraggedId=null,this._handleEntityDragStart=(e,t)=>{const i=e.target.closest(".entity-list-item");i?(i.classList.add("dragging"),this._entityDraggedId=i.dataset.entityId||null,e.dataTransfer&&(e.dataTransfer.effectAllowed="move",e.dataTransfer.setData("text/plain",this._entityDraggedId||""))):e.preventDefault()},this._handleEntityDragEnd=e=>{const t=e.target.closest(".entity-list-item");t&&t.classList.remove("dragging"),this._entityDraggedId=null},this._handleEntityDragOver=e=>{e.preventDefault(),e.dataTransfer&&(e.dataTransfer.dropEffect="move");const t=e.currentTarget;t.dataset.entityId!==this._entityDraggedId&&t.classList.add("drag-over")},this._handleEntityDragLeave=e=>{e.currentTarget.classList.remove("drag-over")},this._handleEntityDrop=(e,t)=>{e.stopPropagation(),e.preventDefault();const i=e.currentTarget;i.classList.remove("drag-over");const n=this._entityDraggedId,o=i.dataset.entityId;if(!n||!o||n===o)return;const a="favorites"===t?[...this._config.favorite_entities||[]]:[...this._config.room_pin_entities||[]],r=a.indexOf(n),s=a.indexOf(o);if(-1===r||-1===s)return;a.splice(r,1),a.splice(s,0,n);const c="favorites"===t?"favorite_entities":"room_pin_entities",l={...this._config,[c]:a};this._config=l,this._fireConfigChanged(l)}}set hass(e){const t=this._hass;this._hass=e,e.entities!==this._areaEntitiesCacheKey&&(this._areaEntitiesCache.clear(),this._areaEntitiesCacheKey=e.entities),t||this.requestUpdate()}setConfig(e){this._isUpdatingConfig||(this._config=e)}_checkSearchCardDependencies(){const e=void 0!==customElements.get("search-card"),t=void 0!==customElements.get("card-tools");return e&&t}_getAllEntitiesForSelect(){if(!this._hass)return[];const e=Object.values(this._hass.entities),t=Object.values(this._hass.devices),i=new Map;t.forEach(e=>{e.area_id&&i.set(e.id,e.area_id)});const n=this._hass;return Object.keys(n.states).map(t=>{const o=n.states[t],a=e.find(e=>e.entity_id===t);let r=a?.area_id;return!r&&a?.device_id&&(r=i.get(a.device_id)??null),{entity_id:t,name:o?.attributes?.friendly_name||(t.split(".")[1]??t).replace(/_/g," "),area_id:r,device_area_id:r}}).sort((e,t)=>e.name.localeCompare(t.name))}_getAlarmEntities(){return this._hass?Object.keys(this._hass.states).filter(e=>e.startsWith("alarm_control_panel.")).map(e=>{const t=this._hass.states[e];return{entity_id:e,name:t?.attributes?.friendly_name||(e.split(".")[1]??e).replace(/_/g," ")}}).sort((e,t)=>e.name.localeCompare(t.name)):[]}_getWeatherEntities(){return this._hass?Object.keys(this._hass.states).filter(e=>e.startsWith("weather.")).map(e=>{const t=this._hass.states[e];return{entity_id:e,name:t?.attributes?.friendly_name||(e.split(".")[1]??e).replace(/_/g," ")}}).sort((e,t)=>e.name.localeCompare(t.name)):[]}_getPowerSensorEntities(){return this._hass?Object.keys(this._hass.states).filter(e=>{if(!e.startsWith("sensor."))return!1;const t=this._hass.states[e],i=t?.attributes?.device_class,n=t?.attributes?.unit_of_measurement;return"power"===i||"W"===n||"kW"===n}).map(e=>{const t=this._hass.states[e];return{entity_id:e,name:t?.attributes?.friendly_name||(e.split(".")[1]??e).replace(/_/g," ")}}).sort((e,t)=>e.name.localeCompare(t.name)):[]}_getFilteredEntities(e,t=!1){if(!this._hass||e.length<2)return[];const i=e.toLowerCase(),n=this._getAllEntitiesForSelect().filter(e=>!(t&&!e.area_id&&!e.device_area_id)&&(e.name.toLowerCase().includes(i)||e.entity_id.toLowerCase().includes(i)));return n.sort((e,t)=>{const n=e.name.toLowerCase(),o=t.name.toLowerCase(),a=e.entity_id.toLowerCase(),r=t.entity_id.toLowerCase(),s=n===i||a===i;if(s!==(o===i||r===i))return s?-1:1;const c=n.startsWith(i)||a.startsWith(i)||a.split(".")[1]?.startsWith(i);return c!==(o.startsWith(i)||r.startsWith(i)||r.split(".")[1]?.startsWith(i))?c?-1:1:n.localeCompare(o)}),n.slice(0,21)}render(){return this._hass?n.qy`
      <div class="card-config">
        ${this._renderOverviewSection()}
        ${this._renderSummariesSection()}
        ${this._renderFavoritesSection()}
        ${this._renderLightFavoritesSection()}

        <div class="section-divider">
          <div class="section-divider-title">
            ${(0,rt.localize)("editor.section_areas_rooms")}
          </div>
        </div>

        ${this._renderAreasSection()}
        ${this._renderRoomPinsSection()}
        ${this._renderViewsSection()}

        <div class="section-divider">
          <div class="section-divider-title">
            ${(0,rt.localize)("editor.section_advanced")}
          </div>
        </div>

        ${this._renderSectionOrderPanel()}
        ${this._renderWeatherSensorsSection()}
        ${this._renderCustomCardsSection()}
        ${this._renderCustomSectionsSection()}
        ${this._renderCustomBadgesSection()}
        ${this._renderCustomViewsSection()}
      </div>
    `:n.s6}_getSectionsOrder(){return this._config.sections_order||[...at.G]}_updateSectionsOrder(e){const t={...this._config,sections_order:e};this._config=t,this._fireConfigChanged(t)}_isSectionDisabled(e){switch(e){case"custom_cards":return 0===(this._config.custom_cards||[]).length;case"weather":return!1===this._config.show_weather;case"energy":return!1===this._config.show_energy;case"plants":return!0!==this._config.show_plants_section;case"agenda":return!0!==this._config.show_agenda_section;case"todos":return!0!==this._config.show_todos_section;case"persons":return!0!==this._config.show_persons_section;case"vacuums":return!0!==this._config.show_vacuums_section;case"maintenance":return!0!==this._config.show_maintenance_section;default:return!1}}_isSectionToggleable(e){return"weather"===e||"energy"===e||"plants"===e||"agenda"===e||"todos"===e||"persons"===e||"vacuums"===e||"maintenance"===e}_toggleSectionVisibility(e,t){"weather"===e?this._toggleChanged("show_weather",t,!0):"energy"===e?this._toggleChanged("show_energy",t,!0):"plants"===e?this._toggleChanged("show_plants_section",t,!1):"agenda"===e?this._toggleChanged("show_agenda_section",t,!1):"todos"===e?this._toggleChanged("show_todos_section",t,!1):"persons"===e?this._toggleChanged("show_persons_section",t,!1):"vacuums"===e?this._toggleChanged("show_vacuums_section",t,!1):"maintenance"===e&&this._toggleChanged("show_maintenance_section",t,!1)}_setWeatherPresentation(e){const t={...this._config,weather_presentation:e};delete t.show_weather_forecast_card,this._config=t,this._fireConfigChanged(t)}_renderSectionOrderPanel(){return this._hass?pt({hass:this._hass,config:this._config,order:this._getSectionsOrder(),sectionMeta:ut._sectionMeta,weatherEntities:this._getWeatherEntities(),powerSensorEntities:this._getPowerSensorEntities(),isSectionDisabled:e=>this._isSectionDisabled(e),isSectionToggleable:e=>this._isSectionToggleable(e),onToggleChange:(e,t,i)=>this._toggleChanged(e,t,i),onSetWeatherPresentation:e=>this._setWeatherPresentation(e),onWeatherEntityChange:e=>this._weatherEntityChanged(e),onPowerBadgeEntityChange:e=>this._powerBadgeEntityChanged(e),onToggleSectionVisibility:(e,t)=>this._toggleSectionVisibility(e,t),onToggleHiddenHeading:(e,t)=>this._toggleHiddenHeading(e,t),onSectionVisibilityChange:(e,t,i)=>this._sectionVisibilityChanged(e,t,i),onDragStart:this._handleSectionDragStart,onDragEnd:this._handleSectionDragEnd,onDragOver:this._handleSectionDragOver,onDragLeave:this._handleSectionDragLeave,onDrop:this._handleSectionDrop}):n.qy``}_toggleHiddenHeading(e,t){const i=new Set(this._config.hidden_section_headings||[]);t?i.add(e):i.delete(e);const n=[...i],o={...this._config};0===n.length?delete o.hidden_section_headings:o.hidden_section_headings=n,this._fireConfigChanged(o)}_sectionVisibilityChanged(e,t,i){const n={...this._config},o={...n.section_visibility||{}},a={...o[e]||{entity:"",state:""}};a[t]=i.trim(),a.entity||a.state?o[e]=a:delete o[e],0===Object.keys(o).length?delete n.section_visibility:n.section_visibility=o,this._fireConfigChanged(n)}_renderOverviewSection(){if(!this._hass)return n.qy``;const e=this._checkSearchCardDependencies(),t=!0===this._config.show_search_card;return n.qy`
      ${function(e){const{hass:t,config:i,onChange:o}=e,a=function(e){return{show_clock_card:!1!==e.show_clock_card,person_badge_layout:e.person_badge_layout??"with_state",alarm_entity:e.alarm_entity??"",show_search_card:!0===e.show_search_card,search_card_variant:"tip"===e.search_card_variant?"tip":"custom",show_person_badges:!1!==e.show_person_badges}}(i),r=function(e){const t=["minimal","with_state","with_state_and_time"].map(e=>({value:e,label:(0,rt.localize)(`editor.person_badge_layout_${e}`)})),i=["custom","tip"].map(e=>({value:e,label:(0,rt.localize)(`editor.search_card_variant_${e}`)})),n=[{name:"show_clock_card",selector:{boolean:{}}},{name:"person_badge_layout",selector:{select:{mode:"list",options:t}}},{name:"alarm_entity",selector:{entity:{filter:{domain:"alarm_control_panel"}}}},{name:"show_search_card",selector:{boolean:{}}}];return e.show_search_card&&n.push({name:"search_card_variant",selector:{select:{mode:"list",options:i}}}),n.push({name:"show_person_badges",selector:{boolean:{}}}),n}(a);return n.qy`
    <div class="section">
      <div class="section-title">${(0,rt.localize)("editor.section_overview")}</div>
      <ha-form
        .hass=${t}
        .data=${a}
        .schema=${r}
        .computeLabel=${e=>(0,rt.localize)(`editor.${e.name}`)}
        .computeHelper=${e=>{const t=`editor.${e.name}_desc`,i=(0,rt.localize)(t);return i===t?"":i}}
        @value-changed=${e=>{o(function(e){const t={};return t.show_clock_card=!1!==e.show_clock_card&&void 0,t.person_badge_layout=e.person_badge_layout&&"with_state"!==e.person_badge_layout?e.person_badge_layout:void 0,t.alarm_entity=e.alarm_entity?e.alarm_entity:void 0,t.show_search_card=!0===e.show_search_card||void 0,t.search_card_variant="tip"===e.search_card_variant?"tip":void 0,t.show_person_badges=!1!==e.show_person_badges&&void 0,t}(e.detail.value))}}
      ></ha-form>
    </div>
  `}({hass:this._hass,config:this._config,onChange:e=>{const t={...this._config,...e};for(const i of Object.keys(e))void 0===e[i]&&delete t[i];this._config=t,this._fireConfigChanged(t)}})}
      ${t&&!e?n.qy`<div class="description" style="margin-top: -8px;">
            <span>&#x26A0;&#xFE0F; ${(0,o._)((0,rt.localize)("editor.show_search_card_missing"))}</span>
          </div>`:n.s6}
    `}_searchCardVariantChanged(e){const t={...this._config};"custom"===e?delete t.search_card_variant:t.search_card_variant=e,this._fireConfigChanged(t)}_renderSummariesSection(){return this._hass?function(e){const{hass:t,config:i,onChange:o,securityExtraSlot:a}=e,r={summaries_columns:4===(s=i).summaries_columns?4:2,show_light_summary:!1!==s.show_light_summary,group_lights_by_floors:!0===s.group_lights_by_floors,nested_light_groups:!0===s.nested_light_groups,lights_sort_by:"name"===s.lights_sort_by?"name":"last_changed",show_covers_summary:!1!==s.show_covers_summary,show_partially_open_covers:!0===s.show_partially_open_covers,group_covers_by_floors:!0===s.group_covers_by_floors,show_security_summary:!1!==s.show_security_summary,show_climate_summary:!0===s.show_climate_summary,show_battery_summary:!1!==s.show_battery_summary,hide_mobile_app_batteries:!0===s.hide_mobile_app_batteries,show_area_in_battery_view:!0===s.show_area_in_battery_view,hide_battery_notes_entities:!0===s.hide_battery_notes_entities,battery_critical_threshold:s.battery_critical_threshold??20,battery_low_threshold:s.battery_low_threshold??50,unavailable_batteries_bucket:"critical"===s.unavailable_batteries_bucket?"critical":"good"};var s;return n.qy`
    <div class="section">
      <div class="section-title">${(0,rt.localize)("editor.section_summaries")}</div>
      <ha-form
        .hass=${t}
        .data=${r}
        .schema=${lt}
        .computeLabel=${e=>(0,rt.localize)(`editor.${e.name}`)}
        .computeHelper=${e=>{const t=`editor.${e.name}_desc`,i=(0,rt.localize)(t);return i===t?"":i}}
        @value-changed=${e=>{o(function(e){const t={};return t.summaries_columns=4===e.summaries_columns?4:void 0,t.show_light_summary=!1!==e.show_light_summary&&void 0,t.show_covers_summary=!1!==e.show_covers_summary&&void 0,t.show_security_summary=!1!==e.show_security_summary&&void 0,t.show_battery_summary=!1!==e.show_battery_summary&&void 0,t.group_lights_by_floors=!0===e.group_lights_by_floors||void 0,t.nested_light_groups=!0===e.nested_light_groups||void 0,t.show_partially_open_covers=!0===e.show_partially_open_covers||void 0,t.group_covers_by_floors=!0===e.group_covers_by_floors||void 0,t.show_climate_summary=!0===e.show_climate_summary||void 0,t.hide_mobile_app_batteries=!0===e.hide_mobile_app_batteries||void 0,t.show_area_in_battery_view=!0===e.show_area_in_battery_view||void 0,t.hide_battery_notes_entities=!0===e.hide_battery_notes_entities||void 0,t.lights_sort_by="name"===e.lights_sort_by?"name":void 0,t.unavailable_batteries_bucket="critical"===e.unavailable_batteries_bucket?"critical":void 0,t.battery_critical_threshold="number"==typeof e.battery_critical_threshold&&20!==e.battery_critical_threshold?e.battery_critical_threshold:void 0,t.battery_low_threshold="number"==typeof e.battery_low_threshold&&50!==e.battery_low_threshold?e.battery_low_threshold:void 0,t}(e.detail.value))}}
      ></ha-form>
      ${a}
    </div>
  `}({hass:this._hass,config:this._config,securityExtraSlot:this._renderSecurityExtraEntitiesPicker(),onChange:e=>{const t={...this._config,...e};for(const i of Object.keys(e))void 0===e[i]&&delete t[i];this._config=t,this._fireConfigChanged(t)}}):n.qy``}_renderSecurityExtraEntitiesPicker(){const e=this._config.security_extra_entities||[],t=this._getAllEntitiesForSelect(),i=new Map(t.map(e=>[e.entity_id,e.name])),o=this._getFilteredEntities(this._securityExtraSearch);return n.qy`
      <div style="font-size: 13px; font-weight: 500; color: var(--primary-text-color); margin-top: 4px; margin-bottom: 4px;">
        ${(0,rt.localize)("editor.security_extra_entities")}
      </div>
      <div class="description" style="margin-left: 0; margin-bottom: 8px;">
        ${(0,rt.localize)("editor.security_extra_entities_desc")}
      </div>
      ${e.length>0?n.qy`
        <div class="entity-list-container" style="margin-bottom: 8px;">
          ${e.map(e=>{const t=i.get(e)||e;return n.qy`
              <div class="entity-list-item" data-entity-id=${e}>
                <span class="item-info">
                  <span class="item-name">${t}</span>
                  <span class="item-entity-id">${e}</span>
                </span>
                <button class="btn-remove" @click=${()=>this._removeSecurityExtraEntity(e)}>&#x2715;</button>
              </div>
            `})}
        </div>
      `:n.s6}
      <div class="entity-search-picker">
        <input type="text" class="entity-search-input"
          placeholder=${(0,rt.localize)("editor.select_entity")+"..."}
          .value=${this._securityExtraSearch}
          @input=${e=>{this._securityExtraSearch=e.target.value,this.requestUpdate()}}
          @blur=${()=>{setTimeout(()=>{this._securityExtraSearch="",this.requestUpdate()},200)}}
        />
        ${this._securityExtraSearch.length>=2?n.qy`
          <div class="entity-search-results">
            ${o.length>0?o.map(e=>n.qy`
                <div class="entity-search-result" @mousedown=${t=>{t.preventDefault(),this._addSecurityExtraEntity(e.entity_id),this._securityExtraSearch="",this.requestUpdate()}}>
                  <span class="entity-search-name">${e.name}</span>
                  <span class="entity-search-id">${e.entity_id}</span>
                </div>
              `):n.qy`<div class="entity-search-no-results">${(0,rt.localize)("editor.no_results")}</div>`}
          </div>
        `:n.s6}
      </div>
    `}_addSecurityExtraEntity(e){const t=this._config.security_extra_entities||[];if(t.includes(e))return;const i={...this._config,security_extra_entities:[...t,e]};this._fireConfigChanged(i)}_removeSecurityExtraEntity(e){const t=(this._config.security_extra_entities||[]).filter(t=>t!==e),i={...this._config};0===t.length?delete i.security_extra_entities:i.security_extra_entities=t,this._fireConfigChanged(i)}_renderLightFavoritesSection(){if(!this._hass)return n.qy``;const e=this._getAllEntitiesForSelect();return function(e){const t=e.config.light_favorite_entities||[];return n.qy`
    <div class="section">
      <div class="section-title">${(0,rt.localize)("editor.section_light_favorites")}</div>

      ${t.length>0?n.qy`
            <div class="entity-list-container" style="margin-bottom: 8px;">
              ${t.map(t=>{const i=e.entityNameMap.get(t)||t;return n.qy`
                  <div class="entity-list-item" data-entity-id=${t}>
                    <span class="item-info">
                      <span class="item-name">${i}</span>
                      <span class="item-entity-id">${t}</span>
                    </span>
                    <button class="btn-remove" @click=${()=>e.onRemoveEntity(t)}>
                      &#x2715;
                    </button>
                  </div>
                `})}
            </div>
          `:n.s6}

      <div class="entity-search-picker">
        <input
          type="text"
          class="entity-search-input"
          placeholder=${(0,rt.localize)("editor.select_entity")+"..."}
          .value=${e.search}
          @input=${t=>e.onSearchChange(t.target.value)}
          @blur=${()=>setTimeout(()=>e.onSearchChange(""),200)}
        />
        ${e.search.length>=2?n.qy`
              <div class="entity-search-results">
                ${e.filteredEntities.length>0?e.filteredEntities.map(t=>n.qy`
                        <div
                          class="entity-search-result"
                          @mousedown=${i=>{i.preventDefault(),e.onAddEntity(t.entity_id),e.onSearchChange("")}}
                        >
                          <span class="entity-search-name">${t.name}</span>
                          <span class="entity-search-id">${t.entity_id}</span>
                        </div>
                      `):n.qy`<div class="entity-search-no-results">${(0,rt.localize)("editor.no_results")}</div>`}
              </div>
            `:n.s6}
      </div>
      <div class="description">${(0,rt.localize)("editor.light_favorites_desc")}</div>
    </div>
  `}({config:this._config,search:this._lightFavSearch,entityNameMap:new Map(e.map(e=>[e.entity_id,e.name])),filteredEntities:this._getFilteredEntities(this._lightFavSearch).filter(e=>e.entity_id.startsWith("light.")),onSearchChange:e=>{this._lightFavSearch=e,this.requestUpdate()},onAddEntity:e=>this._addLightFavorite(e),onRemoveEntity:e=>this._removeLightFavorite(e)})}_unavailableBatteriesBucketChanged(e){const t={...this._config};"good"===e?delete t.unavailable_batteries_bucket:t.unavailable_batteries_bucket=e,this._fireConfigChanged(t)}_lightsSortByChanged(e){const t={...this._config};"last_changed"===e?delete t.lights_sort_by:t.lights_sort_by=e,this._fireConfigChanged(t)}_addLightFavorite(e){const t=this._config.light_favorite_entities||[];if(t.includes(e))return;const i={...this._config,light_favorite_entities:[...t,e]};this._fireConfigChanged(i)}_removeLightFavorite(e){const t=(this._config.light_favorite_entities||[]).filter(t=>t!==e),i={...this._config};0===t.length?delete i.light_favorite_entities:i.light_favorite_entities=t,this._fireConfigChanged(i)}_renderFavoritesSection(){if(!this._hass)return n.qy``;const e=this._getAllEntitiesForSelect();return function(e){const t=e.config.favorite_entities||[],i=!0===e.config.favorites_show_state,o=!0===e.config.favorites_hide_last_changed;return n.qy`
    <div class="section">
      <div class="section-title">${(0,rt.localize)("editor.section_favorites")}</div>

      <div id="favorites-list" style="margin-bottom: 12px;">
        ${0===t.length?n.qy`<div class="empty-state">${(0,rt.localize)("editor.no_favorites")}</div>`:n.qy`
              <div class="entity-list-container">
                ${t.map(t=>{const i=e.entityNameMap.get(t)||t;return n.qy`
                    <div
                      class="entity-list-item"
                      data-entity-id=${t}
                      draggable="true"
                      @dragstart=${e.onDragStart}
                      @dragend=${e.onDragEnd}
                      @dragover=${e.onDragOver}
                      @dragleave=${e.onDragLeave}
                      @drop=${e.onDrop}
                    >
                      <span class="drag-icon">&#x2630;</span>
                      <span class="item-info">
                        <span class="item-name">${i}</span>
                        <span class="item-entity-id">${t}</span>
                      </span>
                      <button class="btn-remove" @click=${()=>e.onRemoveEntity(t)}>
                        &#x2715;
                      </button>
                    </div>
                  `})}
              </div>
            `}
      </div>

      <div class="entity-search-picker">
        <input
          type="text"
          class="entity-search-input"
          placeholder=${(0,rt.localize)("editor.select_entity")+"..."}
          .value=${e.search}
          @input=${t=>e.onSearchChange(t.target.value)}
          @blur=${()=>setTimeout(()=>e.onSearchChange(""),200)}
        />
        ${e.search.length>=2?n.qy`
              <div class="entity-search-results">
                ${e.filteredEntities.length>0?e.filteredEntities.map(t=>n.qy`
                        <div
                          class="entity-search-result"
                          @mousedown=${i=>{i.preventDefault(),e.onAddEntity(t.entity_id),e.onSearchChange("")}}
                        >
                          <span class="entity-search-name">${t.name}</span>
                          <span class="entity-search-id">${t.entity_id}</span>
                        </div>
                      `):n.qy`<div class="entity-search-no-results">${(0,rt.localize)("editor.no_results")}</div>`}
              </div>
            `:n.s6}
      </div>
      <div class="description">${(0,rt.localize)("editor.favorites_desc")}</div>

      ${e.renderCheckbox("favorites-show-state",(0,rt.localize)("editor.show_state"),i,t=>e.onToggleChange("favorites_show_state",t,!1))}
      ${e.renderCheckbox("favorites-hide-last-changed",(0,rt.localize)("editor.hide_last_changed"),o,t=>e.onToggleChange("favorites_hide_last_changed",t,!1))}
    </div>
  `}({config:this._config,search:this._favoriteSearch,entityNameMap:new Map(e.map(e=>[e.entity_id,e.name])),filteredEntities:this._getFilteredEntities(this._favoriteSearch),renderCheckbox:(e,t,i,n)=>this._renderCheckbox(e,t,i,n),onSearchChange:e=>{this._favoriteSearch=e,this.requestUpdate()},onAddEntity:e=>this._addFavoriteEntity(e),onRemoveEntity:e=>this._removeFavoriteEntity(e),onToggleChange:(e,t,i)=>this._toggleChanged(e,t,i),onDragStart:e=>this._handleEntityDragStart(e,"favorites"),onDragEnd:this._handleEntityDragEnd,onDragOver:this._handleEntityDragOver,onDragLeave:this._handleEntityDragLeave,onDrop:e=>this._handleEntityDrop(e,"favorites")})}_renderWeatherSensorsSection(){if(!this._hass)return n.qy``;const e=this._getAllEntitiesForSelect();return function(e){const t=e.config.weather_sensors||[];return n.qy`
    <div class="section">
      <div class="section-title">${(0,rt.localize)("editor.section_weather_sensors")}</div>
      <div class="description" style="margin-left: 0; margin-bottom: 12px;">
        ${(0,rt.localize)("editor.weather_sensors_desc")}
      </div>

      <div id="weather-sensors-list" style="margin-bottom: 12px;">
        ${0===t.length?n.qy`<div class="empty-state">${(0,rt.localize)("editor.no_weather_sensors")}</div>`:t.map((t,i)=>{const o=e.entityNameMap.get(t.entity)||t.entity;return n.qy`
                <div class="custom-item" data-sensor-index=${i}>
                  <div class="custom-item-header">
                    <strong>
                      ${o}
                      <span class="item-entity-id" style="font-weight: normal; margin-left: 8px;">
                        ${t.entity}
                      </span>
                    </strong>
                    <button class="btn-remove" @click=${()=>e.onRemoveSensor(i)}>
                      &#x2715;
                    </button>
                  </div>
                  <div class="custom-item-fields">
                    <div class="custom-item-row">
                      <input
                        type="text"
                        style="flex: 2;"
                        placeholder=${(0,rt.localize)("editor.weather_sensors_icon")}
                        .value=${t.icon||""}
                        @change=${t=>e.onUpdateSensor(i,"icon",t.target.value)}
                      />
                      <input
                        type="text"
                        style="flex: 1;"
                        placeholder=${(0,rt.localize)("editor.weather_sensors_unit")}
                        .value=${t.unit||""}
                        @change=${t=>e.onUpdateSensor(i,"unit",t.target.value)}
                      />
                      <input
                        type="number"
                        style="flex: 1;"
                        min="0"
                        max="6"
                        step="1"
                        placeholder=${(0,rt.localize)("editor.weather_sensors_round")}
                        .value=${void 0!==t.round?String(t.round):""}
                        @change=${t=>e.onUpdateSensor(i,"round",t.target.value)}
                      />
                    </div>
                  </div>
                </div>
              `})}
      </div>

      <div class="entity-search-picker">
        <input
          type="text"
          class="entity-search-input"
          placeholder=${(0,rt.localize)("editor.weather_sensors_add")}
          .value=${e.search}
          @input=${t=>e.onSearchChange(t.target.value)}
          @blur=${()=>setTimeout(()=>e.onSearchChange(""),200)}
        />
        ${e.search.length>=2?n.qy`
              <div class="entity-search-results">
                ${e.filteredEntities.length>0?e.filteredEntities.map(t=>n.qy`
                        <div
                          class="entity-search-result"
                          @mousedown=${i=>{i.preventDefault(),e.onAddSensor(t.entity_id),e.onSearchChange("")}}
                        >
                          <span class="entity-search-name">${t.name}</span>
                          <span class="entity-search-id">${t.entity_id}</span>
                        </div>
                      `):n.qy`<div class="entity-search-no-results">${(0,rt.localize)("editor.no_results")}</div>`}
              </div>
            `:n.s6}
      </div>
    </div>
  `}({config:this._config,search:this._weatherSensorSearch,entityNameMap:new Map(e.map(e=>[e.entity_id,e.name])),filteredEntities:this._getFilteredEntities(this._weatherSensorSearch),onSearchChange:e=>{this._weatherSensorSearch=e,this.requestUpdate()},onAddSensor:e=>this._addWeatherSensor(e),onRemoveSensor:e=>this._removeWeatherSensor(e),onUpdateSensor:(e,t,i)=>this._updateWeatherSensor(e,t,i)})}_inferWeatherSensorDefaults(e){const t=this._hass?.states[e],i=t?.attributes||{},n={},o="string"==typeof i.device_class?i.device_class:void 0,a=o?ut._DEVICE_CLASS_DEFAULTS[o]:void 0,r=("string"==typeof i.icon?i.icon:void 0)||a?.icon;r&&ut._ICON_RE.test(r)&&(n.icon=r);const s="string"==typeof i.unit_of_measurement?i.unit_of_measurement:void 0;return s&&s.length>0&&(n.unit=s),a&&void 0!==a.round&&(n.round=a.round),n}_addWeatherSensor(e){if(!this._hass)return;const t=this._config.weather_sensors||[];if(t.some(t=>t.entity===e))return;const i=this._inferWeatherSensorDefaults(e),n={entity:e,...i},o={...this._config,weather_sensors:[...t,n]};this._config=o,this._fireConfigChanged(o)}_removeWeatherSensor(e){const t=this._config.weather_sensors||[];if(e<0||e>=t.length)return;const i=[...t.slice(0,e),...t.slice(e+1)],n={...this._config};i.length>0?n.weather_sensors=i:delete n.weather_sensors,this._config=n,this._fireConfigChanged(n)}_updateWeatherSensor(e,t,i){const n=this._config.weather_sensors||[];if(e<0||e>=n.length)return;const o={...n[e]},a=i.trim();if("round"===t)if(""===a)delete o.round;else{const e=Number.parseInt(a,10);Number.isFinite(e)&&e>=0&&(o.round=e)}else if("icon"===t||"unit"===t)""===a?delete o[t]:o[t]=a;else if("entity"===t)return;const r=[...n];r[e]=o;const s={...this._config,weather_sensors:r};this._config=s,this._fireConfigChanged(s)}_renderAreasSection(){return this._hass?function(e){const t=e.config,i=!0===t.group_by_floors,o=!0===t.show_switches_on_areas,a=!0===t.show_alerts_on_areas,r=!0===t.show_window_alerts_on_areas,s=!0===t.show_locks_in_rooms,c=!0===t.show_automations_in_rooms,l=!0===t.show_scripts_in_rooms,d=!1!==t.show_cameras_in_rooms,h=!1!==t.show_window_contacts_in_rooms,p=!1!==t.show_door_contacts_in_rooms,u=!0===t.use_default_area_sort,g=Object.values(e.hass.areas).sort((e,t)=>e.name.localeCompare(t.name)),_=t.areas_display?.hidden||[],m=t.areas_display?.order||[];return n.qy`
    <div class="section">
      <div class="section-title">${(0,rt.localize)("editor.section_areas")}</div>

      ${e.renderCheckbox("group-by-floors",(0,rt.localize)("editor.group_by_floors"),i,t=>e.onToggleChange("group_by_floors",t,!1))}
      <div class="description">${(0,rt.localize)("editor.group_by_floors_desc")}</div>

      ${e.renderCheckbox("show-switches-on-areas",(0,rt.localize)("editor.show_switches_on_areas"),o,t=>e.onToggleChange("show_switches_on_areas",t,!1))}
      <div class="description">${(0,rt.localize)("editor.show_switches_on_areas_desc")}</div>

      ${e.renderCheckbox("show-alerts-on-areas",(0,rt.localize)("editor.show_alerts_on_areas"),a,t=>e.onToggleChange("show_alerts_on_areas",t,!1))}
      <div class="description">${(0,rt.localize)("editor.show_alerts_on_areas_desc")}</div>

      ${e.renderCheckbox("show-window-alerts-on-areas",(0,rt.localize)("editor.show_window_alerts_on_areas"),r,t=>e.onToggleChange("show_window_alerts_on_areas",t,!1))}
      <div class="description">${(0,rt.localize)("editor.show_window_alerts_on_areas_desc")}</div>

      ${e.renderCheckbox("show-locks-in-rooms",(0,rt.localize)("editor.show_locks_in_rooms"),s,t=>e.onToggleChange("show_locks_in_rooms",t,!1))}
      <div class="description">${(0,rt.localize)("editor.show_locks_in_rooms_desc")}</div>

      ${e.renderCheckbox("show-automations-in-rooms",(0,rt.localize)("editor.show_automations_in_rooms"),c,t=>e.onToggleChange("show_automations_in_rooms",t,!1))}
      <div class="description">${(0,rt.localize)("editor.show_automations_in_rooms_desc")}</div>

      ${e.renderCheckbox("show-scripts-in-rooms",(0,rt.localize)("editor.show_scripts_in_rooms"),l,t=>e.onToggleChange("show_scripts_in_rooms",t,!1))}
      <div class="description">${(0,rt.localize)("editor.show_scripts_in_rooms_desc")}</div>

      ${e.renderCheckbox("show-cameras-in-rooms",(0,rt.localize)("editor.show_cameras_in_rooms"),d,t=>e.onToggleChange("show_cameras_in_rooms",t,!0))}
      <div class="description">${(0,rt.localize)("editor.show_cameras_in_rooms_desc")}</div>

      ${e.renderCheckbox("show-window-contacts-in-rooms",(0,rt.localize)("editor.show_window_contacts_in_rooms"),h,t=>e.onToggleChange("show_window_contacts_in_rooms",t,!0))}
      <div class="description">${(0,rt.localize)("editor.show_window_contacts_in_rooms_desc")}</div>

      ${e.renderCheckbox("show-door-contacts-in-rooms",(0,rt.localize)("editor.show_door_contacts_in_rooms"),p,t=>e.onToggleChange("show_door_contacts_in_rooms",t,!0))}
      <div class="description">${(0,rt.localize)("editor.show_door_contacts_in_rooms_desc")}</div>

      ${e.renderCheckbox("hide-unavailable-in-rooms",(0,rt.localize)("editor.hide_unavailable_in_rooms"),!1!==t.hide_unavailable_in_rooms,t=>e.onToggleChange("hide_unavailable_in_rooms",t,!0))}
      <div class="description">${(0,rt.localize)("editor.hide_unavailable_in_rooms_desc")}</div>

      ${e.renderCheckbox("use-default-area-sort",(0,rt.localize)("editor.use_default_area_sort"),u,t=>e.onToggleChange("use_default_area_sort",t,!1))}
      <div class="description">${(0,rt.localize)("editor.use_default_area_sort_desc")}</div>

      <div class="description" style="margin-left: 0; margin-top: 16px; margin-bottom: 12px;">
        ${(0,rt.localize)("editor.areas_manage_desc")}
      </div>

      <div class="area-list" id="area-list">
        ${e.renderAreaItems(g,_,m)}
      </div>

      <details style="margin-top: 12px;">
        <summary
          style="cursor: pointer; font-size: 13px; font-weight: 500; color: var(--primary-text-color); padding: 4px 0;"
        >
          ${(0,rt.localize)("editor.room_visibility")}
        </summary>
        <div style="margin-left: 14px; margin-top: 6px;">
          <div class="description" style="margin-left: 0; margin-bottom: 8px;">
            ${(0,rt.localize)("editor.room_visibility_desc")}
          </div>
          ${g.filter(e=>!_.includes(e.area_id)).map(i=>{const o=t.room_visibility?.[i.area_id];return n.qy`
                <div
                  style="border: 1px solid var(--divider-color); border-radius: 6px; padding: 8px; margin-bottom: 8px;"
                >
                  <div style="font-weight: 500; margin-bottom: 6px;">${i.name}</div>
                  <div class="form-row">
                    <label
                      for="room-vis-entity-${i.area_id}"
                      style="min-width: 80px; font-size: 12px;"
                      >${(0,rt.localize)("editor.section_visibility_entity")}</label
                    >
                    <input
                      type="text"
                      id="room-vis-entity-${i.area_id}"
                      style="flex: 1;"
                      placeholder="input_boolean.guest_mode"
                      .value=${o?.entity||""}
                      @change=${t=>e.onRoomVisibilityChange(i.area_id,"entity",t.target.value)}
                    />
                  </div>
                  <div class="form-row">
                    <label
                      for="room-vis-state-${i.area_id}"
                      style="min-width: 80px; font-size: 12px;"
                      >${(0,rt.localize)("editor.section_visibility_state")}</label
                    >
                    <input
                      type="text"
                      id="room-vis-state-${i.area_id}"
                      style="flex: 1;"
                      placeholder="on"
                      .value=${o?.state||""}
                      @change=${t=>e.onRoomVisibilityChange(i.area_id,"state",t.target.value)}
                    />
                  </div>
                </div>
              `})}
        </div>
      </details>
    </div>
  `}({hass:this._hass,config:this._config,renderCheckbox:(e,t,i,n,o)=>this._renderCheckbox(e,t,i,n,o),renderAreaItems:(e,t,i)=>this._renderAreaItems(e,t,i),onToggleChange:(e,t,i)=>this._toggleChanged(e,t,i),onRoomVisibilityChange:(e,t,i)=>this._roomVisibilityChanged(e,t,i)}):n.qy``}_roomVisibilityChanged(e,t,i){const n={...this._config},o={...n.room_visibility||{}},a={...o[e]||{entity:"",state:""}};a[t]=i.trim(),a.entity||a.state?o[e]=a:delete o[e],0===Object.keys(o).length?delete n.room_visibility:n.room_visibility=o,this._fireConfigChanged(n)}_renderRoomPinsSection(){return this._hass?function(e){const t=e.config.room_pin_entities||[],i=!0===e.config.room_pins_show_state,a=!0===e.config.room_pins_hide_last_changed,r="bottom"===e.config.room_pins_position?"bottom":"top",s=Object.values(e.hass.areas).sort((e,t)=>e.name.localeCompare(t.name)),c=new Map(e.allEntitiesForSelect.map(e=>[e.entity_id,e])),l=new Map(s.map(e=>[e.area_id,e.name]));return n.qy`
    <div class="section">
      <div class="section-title">${(0,rt.localize)("editor.section_room_pins")}</div>

      <div id="room-pins-list" style="margin-bottom: 12px;">
        ${0===t.length?n.qy`<div class="empty-state">${(0,rt.localize)("editor.no_room_pins")}</div>`:n.qy`
              <div class="entity-list-container">
                ${t.map(t=>{const i=c.get(t),o=i?.name||t,a=i?.area_id||i?.device_area_id,r=a?l.get(a)||a:(0,rt.localize)("editor.no_room");return n.qy`
                    <div
                      class="entity-list-item"
                      data-entity-id=${t}
                      draggable="true"
                      @dragstart=${e.onDragStart}
                      @dragend=${e.onDragEnd}
                      @dragover=${e.onDragOver}
                      @dragleave=${e.onDragLeave}
                      @drop=${e.onDrop}
                    >
                      <span class="drag-icon">&#x2630;</span>
                      <span class="item-info">
                        <span class="item-name">${o}</span>
                        <span class="item-entity-id">${t}</span>
                        <span class="item-area">&#x1F4CD; ${r}</span>
                      </span>
                      <button class="btn-remove" @click=${()=>e.onRemoveEntity(t)}>
                        &#x2715;
                      </button>
                    </div>
                  `})}
              </div>
            `}
      </div>

      <div class="entity-search-picker">
        <input
          type="text"
          class="entity-search-input"
          placeholder=${(0,rt.localize)("editor.select_entity")+"..."}
          .value=${e.search}
          @input=${t=>e.onSearchChange(t.target.value)}
          @blur=${()=>setTimeout(()=>e.onSearchChange(""),200)}
        />
        ${e.search.length>=2?n.qy`
              <div class="entity-search-results">
                ${e.filteredEntities.length>0?e.filteredEntities.map(t=>n.qy`
                        <div
                          class="entity-search-result"
                          @mousedown=${i=>{i.preventDefault(),e.onAddEntity(t.entity_id),e.onSearchChange("")}}
                        >
                          <span class="entity-search-name">${t.name}</span>
                          <span class="entity-search-id">${t.entity_id}</span>
                        </div>
                      `):n.qy`<div class="entity-search-no-results">${(0,rt.localize)("editor.no_results")}</div>`}
              </div>
            `:n.s6}
      </div>
      <div class="description">${(0,o._)((0,rt.localize)("editor.room_pins_desc"))}</div>

      ${e.renderCheckbox("room-pins-show-state",(0,rt.localize)("editor.show_state"),i,t=>e.onToggleChange("room_pins_show_state",t,!1))}
      ${e.renderCheckbox("room-pins-hide-last-changed",(0,rt.localize)("editor.hide_last_changed"),a,t=>e.onToggleChange("room_pins_hide_last_changed",t,!1))}

      <div
        style="font-size: 13px; font-weight: 500; color: var(--primary-text-color); margin-top: 12px; margin-bottom: 4px;"
      >
        ${(0,rt.localize)("editor.room_pins_position")}
      </div>
      <div class="form-row">
        <input
          type="radio"
          id="room-pins-top"
          name="room-pins-position"
          value="top"
          ?checked=${"top"===r}
          @change=${()=>e.onPositionChange("top")}
        />
        <label for="room-pins-top">${(0,rt.localize)("editor.room_pins_position_top")}</label>
      </div>
      <div class="form-row">
        <input
          type="radio"
          id="room-pins-bottom"
          name="room-pins-position"
          value="bottom"
          ?checked=${"bottom"===r}
          @change=${()=>e.onPositionChange("bottom")}
        />
        <label for="room-pins-bottom">${(0,rt.localize)("editor.room_pins_position_bottom")}</label>
      </div>
      <div class="description">${(0,rt.localize)("editor.room_pins_position_desc")}</div>
    </div>
  `}({hass:this._hass,config:this._config,search:this._roomPinSearch,allEntitiesForSelect:this._getAllEntitiesForSelect(),filteredEntities:this._getFilteredEntities(this._roomPinSearch,!0),renderCheckbox:(e,t,i,n)=>this._renderCheckbox(e,t,i,n),onSearchChange:e=>{this._roomPinSearch=e,this.requestUpdate()},onAddEntity:e=>this._addRoomPinEntity(e),onRemoveEntity:e=>this._removeRoomPinEntity(e),onPositionChange:e=>this._roomPinsPositionChanged(e),onToggleChange:(e,t,i)=>this._toggleChanged(e,t,i),onDragStart:e=>this._handleEntityDragStart(e,"room_pins"),onDragEnd:this._handleEntityDragEnd,onDragOver:this._handleEntityDragOver,onDragLeave:this._handleEntityDragLeave,onDrop:e=>this._handleEntityDrop(e,"room_pins")}):n.qy``}_roomPinsPositionChanged(e){const t={...this._config};"top"===e?delete t.room_pins_position:t.room_pins_position=e,this._fireConfigChanged(t)}_renderViewsSection(){return this._hass?function(e){const{hass:t,config:i,onChange:o}=e,a={show_summary_views:!0===i.show_summary_views,show_room_views:!0===i.show_room_views};return n.qy`
    <div class="section">
      <div class="section-title">${(0,rt.localize)("editor.section_views")}</div>
      <ha-form
        .hass=${t}
        .data=${a}
        .schema=${ct}
        .computeLabel=${e=>(0,rt.localize)(`editor.${e.name}`)}
        .computeHelper=${e=>(0,rt.localize)(`editor.${e.name}_desc`)}
        @value-changed=${e=>{const t={};for(const i of Object.keys(e.detail.value)){const n=e.detail.value[i];t[i]=!0===n||void 0}o(t)}}
      ></ha-form>
    </div>
  `}({hass:this._hass,config:this._config,onChange:e=>{const t={...this._config,...e};for(const i of Object.keys(e))void 0===e[i]&&delete t[i];this._config=t,this._fireConfigChanged(t)}}):n.qy``}_renderCustomCardsSection(){return this._hass?function(e){const t=e.config.custom_cards||[],i=e.config.custom_cards_heading||"",o=e.config.custom_cards_icon||"";return n.qy`
    <div class="section">
      <div class="section-title" style="display: flex; align-items: center; gap: 8px;">
        ${(0,rt.localize)("editor.section_custom_cards")}
      </div>
      <div class="custom-item-row" style="margin-bottom: 12px;">
        <input
          type="text"
          id="custom-cards-heading"
          .value=${i}
          placeholder=${(0,rt.localize)("editor.custom_cards_heading_placeholder")}
          style="flex: 2;"
          @change=${t=>e.onHeadingChange(t.target.value)}
        />
        <input
          type="text"
          id="custom-cards-icon"
          .value=${o}
          placeholder="mdi:cards"
          style="flex: 1;"
          @change=${t=>e.onIconChange(t.target.value)}
        />
      </div>
      <div class="description" style="margin-bottom: 8px;">
        ${(0,rt.localize)("editor.custom_cards_desc")}
      </div>

      <div id="custom-cards-list">
        ${0===t.length?n.qy`<div class="empty-state">${(0,rt.localize)("editor.no_custom_cards")}</div>`:t.map((t,i)=>function(e,t,i){const o=t._yaml_error?n.qy`<span style="color: var(--error-color);">&#x274C; ${t._yaml_error}</span>`:t.yaml?n.qy`<span style="color: var(--success-color, green);">&#x2705; ${(0,rt.localize)("editor.yaml_valid")}</span>`:n.s6;return n.qy`
    <div class="custom-item" data-index=${i}>
      <div class="custom-item-header">
        <strong>${t.title||(0,rt.localize)("editor.new_card")}</strong>
        <button class="btn-remove" @click=${()=>e.onRemoveCard(i)}>&#x2715;</button>
      </div>
      <div class="custom-item-fields">
        <input
          type="text"
          .value=${t.title||""}
          placeholder=${(0,rt.localize)("editor.card_title_placeholder")}
          @change=${t=>e.onUpdateField(i,"title",t.target.value)}
        />
        <div class="custom-card-target">
          <label>${(0,rt.localize)("editor.target_section")}:</label>
          <select
            @change=${t=>e.onUpdateField(i,"target_section",t.target.value)}
          >
            ${[...e.sectionMeta.entries()].map(([e,i])=>n.qy`
                <option value=${e} ?selected=${(t.target_section||"custom_cards")===e}>
                  ${(0,rt.localize)(i.labelKey)}
                </option>
              `)}
          </select>
        </div>
        <textarea
          rows="6"
          placeholder=${(0,rt.localize)("editor.yaml_placeholder")}
          .value=${t.yaml||""}
          style="width: 100%;"
          @change=${t=>e.onUpdateYaml(i,t.target.value)}
        ></textarea>
        <div class="custom-item-validation">${o}</div>
      </div>
    </div>
  `}(e,t,i))}
      </div>

      <button class="btn-primary" style="margin-top: 8px;" @click=${()=>e.onAddCard()}>
        ${(0,rt.localize)("editor.add_custom_card")}
      </button>
      <div class="description">${(0,rt.localize)("editor.custom_cards_help")}</div>
    </div>
  `}({config:this._config,sectionMeta:ut._sectionMeta,onHeadingChange:e=>this._customCardsHeadingChanged({target:{value:e}}),onIconChange:e=>this._customCardsIconChanged({target:{value:e}}),onAddCard:()=>this._addCustomCard(),onRemoveCard:e=>this._removeCustomCard(e),onUpdateField:(e,t,i)=>this._updateCustomCardField(e,t,i),onUpdateYaml:(e,t)=>this._updateCustomCardYaml(e,t)}):n.qy``}_renderCustomSectionsSection(){return this._hass?function(e){const t=e.config.custom_sections||[];return n.qy`
    <div class="section">
      <div class="section-title">${(0,rt.localize)("editor.section_custom_sections")}</div>
      <div class="description" style="margin-bottom: 8px;">
        ${(0,rt.localize)("editor.custom_sections_desc")}
      </div>

      <div id="custom-sections-list">
        ${0===t.length?n.qy`<div class="empty-state">${(0,rt.localize)("editor.no_custom_sections")}</div>`:t.map((t,i)=>function(e,t,i){const o=t._yaml_error?n.qy`<span style="color: var(--error-color);">&#x274C; ${t._yaml_error}</span>`:t.parsed_config?n.qy`<span style="color: var(--success-color, green);">&#x2705; ${(0,rt.localize)("editor.yaml_valid")}</span>`:n.qy``;return n.qy`
    <div class="custom-item">
      <div class="custom-item-header">
        <span class="custom-item-index">#${i+1}</span>
        <button
          class="btn-icon"
          @click=${()=>e.onRemove(i)}
          title=${(0,rt.localize)("editor.remove")}
        >
          &#x274C;
        </button>
      </div>
      <div class="custom-item-fields">
        <input
          type="text"
          .value=${t.key||""}
          placeholder=${(0,rt.localize)("editor.custom_section_key_placeholder")}
          @change=${t=>e.onUpdateField(i,"key",t.target.value)}
        />
        <input
          type="text"
          .value=${t.heading||""}
          placeholder=${(0,rt.localize)("editor.custom_section_heading_placeholder")}
          @change=${t=>e.onUpdateField(i,"heading",t.target.value)}
        />
        <input
          type="text"
          .value=${t.icon||""}
          placeholder="mdi:card-bulleted"
          @change=${t=>e.onUpdateField(i,"icon",t.target.value)}
        />
        <textarea
          rows="6"
          placeholder=${(0,rt.localize)("editor.custom_section_yaml_placeholder")}
          .value=${t.yaml||""}
          style="width: 100%;"
          @change=${t=>e.onUpdateYaml(i,t.target.value)}
        ></textarea>
        <div class="custom-item-validation">${o}</div>
      </div>
    </div>
  `}(e,t,i))}
      </div>

      <button class="btn-primary" style="margin-top: 8px;" @click=${()=>e.onAdd()}>
        ${(0,rt.localize)("editor.add_custom_section")}
      </button>
      <div class="description">${(0,rt.localize)("editor.custom_sections_help")}</div>
    </div>
  `}({config:this._config,onAdd:()=>this._addCustomSection(),onRemove:e=>this._removeCustomSection(e),onUpdateField:(e,t,i)=>this._updateCustomSectionField(e,t,i),onUpdateYaml:(e,t)=>this._updateCustomSectionYaml(e,t)}):n.qy``}_renderCustomBadgesSection(){return this._hass?function(e){const t=e.config.custom_badges||[];return n.qy`
    <div class="section">
      <div class="section-title" style="display: flex; align-items: center; gap: 8px;">
        ${(0,rt.localize)("editor.section_custom_badges")}
      </div>

      <div id="custom-badges-list">
        ${0===t.length?n.qy`<div class="empty-state">${(0,rt.localize)("editor.no_custom_badges")}</div>`:t.map((t,i)=>function(e,t,i){const o=t._yaml_error?n.qy`<span style="color: var(--error-color);">&#x274C; ${t._yaml_error}</span>`:t.yaml?n.qy`<span style="color: var(--success-color, green);">&#x2705; ${(0,rt.localize)("editor.yaml_valid")}</span>`:n.s6;return n.qy`
    <div class="custom-item" data-index=${i}>
      <div class="custom-item-header">
        <strong>Badge ${i+1}</strong>
        <button class="btn-remove" @click=${()=>e.onRemove(i)}>&#x2715;</button>
      </div>
      <textarea
        rows="4"
        placeholder="type: entity&#10;entity: sun.sun"
        .value=${t.yaml||""}
        style="width: 100%;"
        @change=${t=>e.onUpdateYaml(i,t.target.value)}
      ></textarea>
      <div class="custom-item-validation">${o}</div>
    </div>
  `}(e,t,i))}
      </div>

      <button class="btn-primary" style="margin-top: 8px;" @click=${()=>e.onAdd()}>
        ${(0,rt.localize)("editor.add_custom_badge")}
      </button>
      <div class="description">${(0,rt.localize)("editor.custom_badges_help")}</div>
    </div>
  `}({config:this._config,onAdd:()=>this._addCustomBadge(),onRemove:e=>this._removeCustomBadge(e),onUpdateYaml:(e,t)=>this._updateCustomBadgeYaml(e,t)}):n.qy``}_renderCustomViewsSection(){return this._hass?function(e){const t=e.config.custom_views||[];return n.qy`
    <div class="section">
      <div class="section-title" style="display: flex; align-items: center; gap: 8px;">
        ${(0,rt.localize)("editor.section_custom_views")}
      </div>

      <div id="custom-views-list">
        ${0===t.length?n.qy`<div class="empty-state">${(0,rt.localize)("editor.no_custom_views")}</div>`:t.map((t,i)=>function(e,t,i){const o=t._yaml_error?n.qy`<span style="color: var(--error-color);">&#x274C; ${t._yaml_error}</span>`:t.yaml?n.qy`<span style="color: var(--success-color, green);">&#x2705; ${(0,rt.localize)("editor.yaml_valid")}</span>`:n.s6;return n.qy`
    <div class="custom-item" data-index=${i}>
      <div class="custom-item-header">
        <strong>${t.title||(0,rt.localize)("editor.new_view")}</strong>
        <button class="btn-remove" @click=${()=>e.onRemove(i)}>&#x2715;</button>
      </div>
      <div class="custom-item-fields">
        <div class="custom-item-row">
          <input
            type="text"
            .value=${t.title||""}
            placeholder=${(0,rt.localize)("editor.title_placeholder")}
            style="flex: 2;"
            @change=${t=>e.onUpdateField(i,"title",t.target.value)}
          />
          <input
            type="text"
            .value=${t.path||""}
            placeholder=${(0,rt.localize)("editor.path_placeholder")}
            style="flex: 2;"
            @change=${t=>e.onUpdateField(i,"path",t.target.value)}
          />
          <input
            type="text"
            .value=${t.icon||""}
            placeholder="mdi:star"
            style="flex: 1;"
            @change=${t=>e.onUpdateField(i,"icon",t.target.value)}
          />
        </div>
        <textarea
          rows="8"
          placeholder=${(0,rt.localize)("editor.yaml_placeholder")}
          .value=${t.yaml||""}
          style="width: 100%;"
          @change=${t=>e.onUpdateYaml(i,t.target.value)}
        ></textarea>
        <div class="custom-item-validation">${o}</div>
      </div>
    </div>
  `}(e,t,i))}
      </div>

      <button class="btn-primary" style="margin-top: 8px;" @click=${()=>e.onAdd()}>
        ${(0,rt.localize)("editor.add_custom_view")}
      </button>
      <div class="description">${(0,rt.localize)("editor.custom_views_help")}</div>
    </div>
  `}({config:this._config,onAdd:()=>this._addCustomView(),onRemove:e=>this._removeCustomView(e),onUpdateField:(e,t,i)=>this._updateCustomViewField(e,t,i),onUpdateYaml:(e,t)=>this._updateCustomViewYaml(e,t)}):n.qy``}_renderCheckbox(e,t,i,o,a=!1){return n.qy`
      <div class="form-row">
        <input type="checkbox" id=${e}
          ?checked=${i}
          ?disabled=${a}
          @change=${e=>o(e.target.checked)} />
        <label for=${e} class=${a?"disabled-label":""}>${t}</label>
      </div>
    `}_renderAreaItems(e,t,i){return 0===e.length?n.qy`<div class="empty-state">${(0,rt.localize)("editor.no_areas")}</div>`:[...e].sort((t,n)=>{const o=i.indexOf(t.area_id),a=i.indexOf(n.area_id);return(-1!==o?o:9999+e.indexOf(t))-(-1!==a?a:9999+e.indexOf(n))}).map(e=>{const i=t.includes(e.area_id),o=this._expandedAreas.has(e.area_id),a=this._areaEntitiesCache.get(e.area_id);return n.qy`
        <div class="area-item"
          data-area-id=${e.area_id}
          draggable="true"
          @dragstart=${this._handleDragStart}
          @dragend=${this._handleDragEnd}
          @dragover=${this._handleDragOver}
          @dragleave=${this._handleDragLeave}
          @drop=${this._handleDrop}>
          <div class="area-header">
            <span class="drag-handle" draggable="true">&#x2630;</span>
            <input type="checkbox" class="area-checkbox"
              data-area-id=${e.area_id}
              ?checked=${!i}
              @change=${t=>this._areaVisibilityChanged(e.area_id,t.target.checked)} />
            <span class="area-name">${e.name}</span>
            ${e.icon?n.qy`<ha-icon class="area-icon" icon=${e.icon}></ha-icon>`:n.s6}
            <button class="expand-button ${o?"expanded":""}"
              data-area-id=${e.area_id}
              ?disabled=${i}
              @click=${t=>this._toggleAreaExpand(t,e.area_id)}>
              <span class="expand-icon">&#x25B6;</span>
            </button>
          </div>
          ${o?n.qy`
              <div class="area-content" data-area-id=${e.area_id}>
                ${a?this._renderAreaEntities(e.area_id,a):n.qy`<div class="loading-placeholder">${(0,rt.localize)("editor.loading_entities")}</div>`}
              </div>
            `:n.s6}
        </div>
      `})}_renderAreaEntities(e,t){const{groupedEntities:i,hiddenEntities:o,badgeCandidates:a,additionalBadges:r,availableEntities:s,defaultShowNames:c,namesVisible:l,namesHidden:d}=t,h=this._hass,p=[{key:"lights",label:(0,rt.localize)("editor.domain_lights"),icon:"mdi:lightbulb"},{key:"climate",label:(0,rt.localize)("editor.domain_climate"),icon:"mdi:thermostat"},{key:"covers",label:(0,rt.localize)("editor.domain_covers"),icon:"mdi:window-shutter"},{key:"covers_curtain",label:(0,rt.localize)("editor.domain_covers_curtain"),icon:"mdi:curtains"},{key:"covers_window",label:(0,rt.localize)("editor.domain_covers_window"),icon:"mdi:window-open-variant"},{key:"media_player",label:(0,rt.localize)("editor.domain_media_player"),icon:"mdi:speaker"},{key:"scenes",label:(0,rt.localize)("editor.domain_scenes"),icon:"mdi:palette"},{key:"vacuum",label:(0,rt.localize)("editor.domain_vacuum"),icon:"mdi:robot-vacuum"},{key:"fan",label:(0,rt.localize)("editor.domain_fan"),icon:"mdi:fan"},{key:"switches",label:(0,rt.localize)("editor.domain_switches"),icon:"mdi:light-switch"},{key:"locks",label:(0,rt.localize)("editor.domain_locks"),icon:"mdi:lock"}],u=p.some(e=>(i[e.key]?.length??0)>0),g=(a?.length??0)>0||(r?.length??0)>0;if(!u&&!g)return n.qy`<div class="empty-state">${(0,rt.localize)("editor.no_entities_in_area")}</div>`;const _=this._expandedGroups.get(e)||new Set;return n.qy`
      <div class="entity-groups">
        ${p.map(t=>{const a=i[t.key];if(!a||0===a.length)return n.s6;const r=o[t.key]||[],s=a.every(e=>r.includes(e)),c=a.some(e=>r.includes(e))&&!s,l=_.has(t.key);return n.qy`
            <div class="entity-group" data-group=${t.key}>
              <div class="entity-group-header"
                @click=${()=>this._toggleGroupExpand(e,t.key)}>
                <input type="checkbox" class="group-checkbox"
                  data-area-id=${e}
                  data-group=${t.key}
                  ?checked=${!s}
                  .indeterminate=${c}
                  @click=${e=>e.stopPropagation()}
                  @change=${i=>{i.stopPropagation();const n=i.target.checked;this._groupVisibilityChanged(e,t.key,n,a)}} />
                <ha-icon icon=${t.icon}></ha-icon>
                <span class="group-name">${t.label}</span>
                <span class="entity-count">(${a.length})</span>
                <button class="expand-button-small ${l?"expanded":""}"
                  @click=${i=>{i.stopPropagation(),this._toggleGroupExpand(e,t.key)}}>
                  <span class="expand-icon-small">&#x25B6;</span>
                </button>
              </div>
              ${l?n.qy`
                  <div class="entity-list" data-area-id=${e} data-group=${t.key}>
                    ${a.map(i=>{const o=h.states[i],a=o?.attributes?.friendly_name||(i.split(".")[1]??i).replace(/_/g," "),s=r.includes(i);return n.qy`
                        <div class="entity-item">
                          <input type="checkbox" class="entity-checkbox"
                            ?checked=${!s}
                            @change=${n=>this._entityVisibilityChanged(e,t.key,i,n.target.checked)} />
                          <span class="entity-name">${a}</span>
                          <span class="entity-id">${i}</span>
                        </div>
                      `})}
                  </div>
                `:n.s6}
            </div>
          `})}
        ${g?this._renderBadgeGroup(e,a,r,s,o,c,l,d,_):n.s6}
      </div>
    `}_renderBadgeGroup(e,t,i,o,a,r,s,c,l){const d=this._hass,h=t.length+i.length;if(0===h)return n.qy``;const p=a.badges||[],u=t.length>0&&t.every(e=>p.includes(e)),g=t.some(e=>p.includes(e))&&!u,_=new Set(s||[]),m=new Set(c||[]),f=e=>(0,st.LN)(e,r.has(e),_,m),y=l.has("badges");return n.qy`
      <div class="entity-group" data-group="badges">
        <div class="entity-group-header"
          @click=${()=>this._toggleGroupExpand(e,"badges")}>
          <input type="checkbox" class="group-checkbox"
            data-area-id=${e}
            data-group="badges"
            ?checked=${!u}
            .indeterminate=${g}
            @click=${e=>e.stopPropagation()}
            @change=${i=>{i.stopPropagation();const n=i.target.checked;this._groupVisibilityChanged(e,"badges",n,t)}} />
          <ha-icon icon="mdi:checkbox-multiple-blank-circle"></ha-icon>
          <span class="group-name">${(0,rt.localize)("editor.domain_badges")}</span>
          <span class="entity-count">(${h})</span>
          <button class="expand-button-small ${y?"expanded":""}"
            @click=${t=>{t.stopPropagation(),this._toggleGroupExpand(e,"badges")}}>
            <span class="expand-icon-small">&#x25B6;</span>
          </button>
        </div>
        ${y?n.qy`
            <div class="entity-list" data-area-id=${e} data-group="badges">
              ${t.map(t=>{const i=d.states[t],o=i?.attributes?.friendly_name||(t.split(".")[1]??t).replace(/_/g," "),a=p.includes(t),r=f(t);return n.qy`
                  <div class="entity-item">
                    <input type="checkbox" class="entity-checkbox"
                      ?checked=${!a}
                      @change=${i=>this._entityVisibilityChanged(e,"badges",t,i.target.checked)} />
                    <span class="entity-name">${o}</span>
                    <input type="checkbox" class="badge-name-checkbox"
                      ?checked=${r}
                      title=${(0,rt.localize)("editor.badges_show_name")}
                      @change=${i=>this._badgeShowNameChanged(e,t,i.target.checked)} />
                    <span class="badge-name-label">${(0,rt.localize)("editor.badges_name_short")}</span>
                    <span class="entity-id">${t}</span>
                  </div>
                `})}

              ${i.length>0?n.qy`
                  <div class="badge-separator">${(0,rt.localize)("editor.badges_additional")}</div>
                  ${i.map(t=>{const i=d.states[t],o=i?.attributes?.friendly_name||(t.split(".")[1]??t).replace(/_/g," "),a=f(t);return n.qy`
                      <div class="entity-item badge-additional-item">
                        <span class="entity-name">${o}</span>
                        <input type="checkbox" class="badge-name-checkbox"
                          ?checked=${a}
                          title=${(0,rt.localize)("editor.badges_show_name")}
                          @change=${i=>this._badgeShowNameChanged(e,t,i.target.checked)} />
                        <span class="badge-name-label">${(0,rt.localize)("editor.badges_name_short")}</span>
                        <span class="entity-id">${t}</span>
                        <button class="badge-remove-btn"
                          title=${(0,rt.localize)("editor.badges_remove")}
                          @click=${()=>this._badgeAdditionalChanged(e,t,!1)}>&#x2715;</button>
                      </div>
                    `})}
                `:n.s6}

              ${o.length>0?n.qy`
                  <div class="badge-add-section">
                    <select class="badge-entity-picker" data-area-id=${e}>
                      <option value="">${(0,rt.localize)("editor.badges_select_entity")}</option>
                      ${o.map(e=>n.qy`
                        <option value=${e.entity_id}>${e.name} (${e.entity_id})</option>
                      `)}
                    </select>
                    <button class="badge-add-button"
                      @click=${t=>this._addBadgeFromPicker(t,e)}>
                      ${(0,rt.localize)("editor.badges_add")}
                    </button>
                  </div>
                `:n.s6}
            </div>
          `:n.s6}
      </div>
    `}async _loadAreaEntities(e){if(!this._hass)return;const t=await async function(e,t){const i=Object.values(t.devices||{}),n=Object.values(t.entities||{}),o=new Set;for(const t of i)t.area_id===e&&o.add(t.id);const a={lights:[],covers:[],covers_curtain:[],covers_window:[],scenes:[],climate:[],media_player:[],vacuum:[],fan:[],humidifier:[],valve:[],water_heater:[],switches:[],locks:[],automations:[],scripts:[],cameras:[]},r=n.filter(e=>e.labels?.includes("no_dboard")).map(e=>e.entity_id);for(const i of n){let n=!1;if(i.area_id?n=i.area_id===e:i.device_id&&o.has(i.device_id)&&(n=!0),!n)continue;if(r.includes(i.entity_id))continue;if(!t.states[i.entity_id])continue;if(i.hidden)continue;const s=t.entities?.[i.entity_id];if(s?.hidden)continue;const c=i.entity_id.split(".")[0],l=t.states[i.entity_id];if(!l)continue;const d=l.attributes?.device_class;"light"===c?a.lights.push(i.entity_id):"cover"===c?"curtain"===d?a.covers_curtain.push(i.entity_id):"window"===d||"door"===d||"gate"===d||"garage"===d?a.covers_window.push(i.entity_id):a.covers.push(i.entity_id):"scene"===c?a.scenes.push(i.entity_id):"climate"===c?a.climate.push(i.entity_id):"media_player"===c?a.media_player.push(i.entity_id):"vacuum"===c?a.vacuum.push(i.entity_id):"fan"===c?a.fan.push(i.entity_id):"switch"===c?a.switches.push(i.entity_id):"lock"===c&&a.locks.push(i.entity_id)}return a}(e,this._hass),i=vt(e,this._config),n=bt(e,this._config),o=gt(e,this._hass),a=_t(e,this._config),r=mt(e,this._hass,o,a),s=ft(o,this._hass),{namesVisible:c,namesHidden:l}=yt(e,this._config);this._areaEntitiesCache.set(e,{groupedEntities:t,hiddenEntities:i,entityOrders:n,badgeCandidates:o,additionalBadges:a,availableEntities:r,defaultShowNames:s,namesVisible:c,namesHidden:l}),this.requestUpdate()}_refreshAreaCache(e){if(!this._hass||!this._areaEntitiesCache.has(e))return;const t=this._areaEntitiesCache.get(e).groupedEntities,i=vt(e,this._config),n=bt(e,this._config),o=gt(e,this._hass),a=_t(e,this._config),r=mt(e,this._hass,o,a),s=ft(o,this._hass),{namesVisible:c,namesHidden:l}=yt(e,this._config);this._areaEntitiesCache.set(e,{groupedEntities:t,hiddenEntities:i,entityOrders:n,badgeCandidates:o,additionalBadges:a,availableEntities:r,defaultShowNames:s,namesVisible:c,namesHidden:l})}_toggleChanged(e,t,i){if(!this._hass)return;const n={...this._config,[e]:t};t===i&&delete n[e],this._config=n,this._fireConfigChanged(n)}_summariesColumnsChanged(e){if(!this._hass)return;const t={...this._config,summaries_columns:e};2===e&&delete t.summaries_columns,this._config=t,this._fireConfigChanged(t)}_personBadgeLayoutChanged(e){const t={...this._config};"with_state"===e?delete t.person_badge_layout:t.person_badge_layout=e,this._fireConfigChanged(t)}_alarmEntityChanged(e){if(!this._hass)return;const t=e.target.value,i={...this._config,alarm_entity:t};t&&""!==t||delete i.alarm_entity,this._config=i,this._fireConfigChanged(i)}_weatherEntityChanged(e){if(!this._hass)return;const t=e.target.value,i={...this._config,weather_entity:t};t&&""!==t||delete i.weather_entity,this._config=i,this._fireConfigChanged(i)}_batteryCriticalChanged(e){const t=parseInt(e.target.value,10);if(isNaN(t)||t<1||t>99)return;const i={...this._config,battery_critical_threshold:t};20===t&&delete i.battery_critical_threshold,this._config=i,this._fireConfigChanged(i)}_batteryLowChanged(e){const t=parseInt(e.target.value,10);if(isNaN(t)||t<1||t>99)return;const i={...this._config,battery_low_threshold:t};50===t&&delete i.battery_low_threshold,this._config=i,this._fireConfigChanged(i)}_addFavoriteFromSelect(){const e=this.shadowRoot.querySelector("#favorite-entity-select");e&&e.value&&(this._addFavoriteEntity(e.value),e.value="")}_addFavoriteEntity(e){if(!this._hass)return;const t=this._config.favorite_entities||[];if(t.includes(e))return;const i={...this._config,favorite_entities:[...t,e]};this._config=i,this._fireConfigChanged(i)}_removeFavoriteEntity(e){if(!this._hass)return;const t=(this._config.favorite_entities||[]).filter(t=>t!==e),i={...this._config,favorite_entities:t.length>0?t:void 0};0===t.length&&delete i.favorite_entities,this._config=i,this._fireConfigChanged(i)}_addRoomPinFromSelect(){const e=this.shadowRoot.querySelector("#room-pin-entity-select");e&&e.value&&(this._addRoomPinEntity(e.value),e.value="")}_addRoomPinEntity(e){if(!this._hass)return;const t=this._config.room_pin_entities||[];if(t.includes(e))return;const i={...this._config,room_pin_entities:[...t,e]};this._config=i,this._fireConfigChanged(i)}_removeRoomPinEntity(e){if(!this._hass)return;const t=(this._config.room_pin_entities||[]).filter(t=>t!==e),i={...this._config,room_pin_entities:t.length>0?t:void 0};0===t.length&&delete i.room_pin_entities,this._config=i,this._fireConfigChanged(i)}_addCustomView(){const e=[...this._config.custom_views||[]];e.push({title:"Neue View",path:`custom-view-${e.length+1}`,icon:"mdi:card-text-outline",yaml:"",parsed_config:void 0});const t={...this._config,custom_views:e};this._config=t,this._fireConfigChanged(t)}_removeCustomView(e){const t=[...this._config.custom_views||[]];t.splice(e,1);const i={...this._config};0===t.length?delete i.custom_views:i.custom_views=t,this._config=i,this._fireConfigChanged(i)}_updateCustomViewField(e,t,i){const n=[...this._config.custom_views||[]];if(!n[e])return;n[e]={...n[e],[t]:i};const o={...this._config,custom_views:n};this._config=o,this._fireConfigChanged(o)}_updateCustomViewYaml(e,t){const i=[...this._config.custom_views||[]];if(!i[e])return;const n={...i[e],yaml:t};if(delete n._yaml_error,t.trim())try{const e=ot.load(t);e&&"object"==typeof e?n.parsed_config=e:(n._yaml_error="YAML muss ein Objekt ergeben",n.parsed_config=void 0)}catch(e){const t=e instanceof Error?e.message.split("\n")[0]:"Ungültiges YAML";n._yaml_error=t||"Ungültiges YAML",n.parsed_config=void 0}else n.parsed_config=void 0;i[e]=n;const o={...this._config,custom_views:i};this._config=o,this._fireConfigChanged(o)}_customCardsHeadingChanged(e){const t=e.target.value.trim(),i={...this._config};t?i.custom_cards_heading=t:delete i.custom_cards_heading,this._config=i,this._fireConfigChanged(i)}_customCardsIconChanged(e){const t=e.target.value.trim(),i={...this._config};t?i.custom_cards_icon=t:delete i.custom_cards_icon,this._config=i,this._fireConfigChanged(i)}_addCustomCard(){const e=[...this._config.custom_cards||[]];e.push({title:"",yaml:"",parsed_config:void 0});const t={...this._config,custom_cards:e};this._config=t,this._fireConfigChanged(t)}_removeCustomCard(e){const t=[...this._config.custom_cards||[]];t.splice(e,1);const i={...this._config};0===t.length?delete i.custom_cards:i.custom_cards=t,this._config=i,this._fireConfigChanged(i)}_updateCustomCardField(e,t,i){const n=[...this._config.custom_cards||[]];if(!n[e])return;n[e]={...n[e],[t]:i};const o={...this._config,custom_cards:n};this._config=o,this._fireConfigChanged(o)}_updateCustomCardYaml(e,t){const i=[...this._config.custom_cards||[]];if(!i[e])return;const n={...i[e],yaml:t};if(delete n._yaml_error,t.trim())try{const e=ot.load(t);e&&"object"==typeof e?n.parsed_config=e:(n._yaml_error="YAML muss ein Objekt oder Array ergeben",n.parsed_config=void 0)}catch(e){const t=e instanceof Error?e.message.split("\n")[0]:"Ungültiges YAML";n._yaml_error=t||"Ungültiges YAML",n.parsed_config=void 0}else n.parsed_config=void 0;i[e]=n;const o={...this._config,custom_cards:i};this._config=o,this._fireConfigChanged(o)}_addCustomSection(){const e=[...this._config.custom_sections||[]];e.push({key:"",heading:"",yaml:"",parsed_config:void 0});const t={...this._config,custom_sections:e};this._config=t,this._fireConfigChanged(t)}_removeCustomSection(e){const t=[...this._config.custom_sections||[]];t.splice(e,1);const i={...this._config};0===t.length?delete i.custom_sections:i.custom_sections=t,this._config=i,this._fireConfigChanged(i)}_updateCustomSectionField(e,t,i){const n=[...this._config.custom_sections||[]];if(!n[e])return;n[e]={...n[e],[t]:i};const o={...this._config,custom_sections:n};this._config=o,this._fireConfigChanged(o)}_updateCustomSectionYaml(e,t){const i=[...this._config.custom_sections||[]];if(!i[e])return;const n={...i[e],yaml:t};if(delete n._yaml_error,t.trim())try{const e=ot.load(t);Array.isArray(e)?n.parsed_config=e:e&&"object"==typeof e?n.parsed_config=[e]:(n._yaml_error="YAML must produce a card or list of cards",n.parsed_config=void 0)}catch(e){const t=e instanceof Error?e.message.split("\n")[0]:"Invalid YAML";n._yaml_error=t||"Invalid YAML",n.parsed_config=void 0}else n.parsed_config=void 0;i[e]=n;const o={...this._config,custom_sections:i};this._config=o,this._fireConfigChanged(o)}_addCustomBadge(){const e=[...this._config.custom_badges||[]];e.push({yaml:"",parsed_config:void 0});const t={...this._config,custom_badges:e};this._config=t,this._fireConfigChanged(t)}_removeCustomBadge(e){const t=[...this._config.custom_badges||[]];t.splice(e,1);const i={...this._config};0===t.length?delete i.custom_badges:i.custom_badges=t,this._config=i,this._fireConfigChanged(i)}_updateCustomBadgeYaml(e,t){const i=[...this._config.custom_badges||[]];if(!i[e])return;const n={...i[e],yaml:t};if(delete n._yaml_error,t.trim())try{const e=ot.load(t);e&&"object"==typeof e?n.parsed_config=e:(n._yaml_error="YAML muss ein Objekt ergeben",n.parsed_config=void 0)}catch(e){const t=e instanceof Error?e.message.split("\n")[0]:"Ungültiges YAML";n._yaml_error=t||"Ungültiges YAML",n.parsed_config=void 0}else n.parsed_config=void 0;i[e]=n;const o={...this._config,custom_badges:i};this._config=o,this._fireConfigChanged(o)}_areaVisibilityChanged(e,t){if(!this._hass)return;let i=[...this._config.areas_display?.hidden||[]];t?i=i.filter(t=>t!==e):(i.includes(e)||i.push(e),this._expandedAreas.delete(e),this._expandedGroups.delete(e),this._areaEntitiesCache.delete(e));const n={...this._config,areas_display:{...this._config.areas_display,hidden:i}};0===n.areas_display?.hidden?.length&&delete n.areas_display.hidden,n.areas_display&&0===Object.keys(n.areas_display).length&&delete n.areas_display,this._config=n,this._fireConfigChanged(n)}_toggleAreaExpand(e,t){e.stopPropagation();const i=new Set(this._expandedAreas);if(i.has(t)){i.delete(t);const e=new Map(this._expandedGroups);e.delete(t),this._expandedGroups=e}else i.add(t),this._areaEntitiesCache.has(t)||this._loadAreaEntities(t);this._expandedAreas=i}_toggleGroupExpand(e,t){const i=new Map(this._expandedGroups),n=new Set(i.get(e)||[]);n.has(t)?n.delete(t):n.add(t),n.size>0?i.set(e,n):i.delete(e),this._expandedGroups=i}_groupVisibilityChanged(e,t,i,n){if(!this._hass)return;const o=((this._config.areas_options?.[e]||{}).groups_options||{})[t];let a=[...o?.hidden||[]];a=i?a.filter(e=>!n.includes(e)):[...new Set([...a,...n])],this._updateEntityConfig(e,t,a)}_entityVisibilityChanged(e,t,i,n){if(!this._hass)return;if("badges_additional"===t)return void this._badgeAdditionalChanged(e,i,n);if("badges_show_name"===t)return void this._badgeShowNameChanged(e,i,n);const o=((this._config.areas_options?.[e]||{}).groups_options||{})[t];let a=[...o?.hidden||[]];n?a=a.filter(e=>e!==i):a.includes(i)||a.push(i),this._updateEntityConfig(e,t,a)}_updateEntityConfig(e,t,i){const n=this._config.areas_options?.[e]||{},o=n.groups_options||{},a={...o[t],hidden:i};0===a.hidden.length&&delete a.hidden;const r={...o,[t]:a};0===Object.keys(r[t]).length&&delete r[t];const s={...n,groups_options:r};0===Object.keys(s.groups_options).length&&delete s.groups_options;const c={...this._config.areas_options,[e]:s};0===Object.keys(c[e]).length&&delete c[e];const l={...this._config,areas_options:c};l.areas_options&&0===Object.keys(l.areas_options).length&&delete l.areas_options,this._config=l,this._fireConfigChanged(l),this._refreshAreaCache(e)}_badgeAdditionalChanged(e,t,i){if(!this._config)return;const n=this._config.areas_options?.[e]||{},o=n.groups_options||{},a=o.badges||{};let r=[...a.additional||[]];i?r.includes(t)||r.push(t):r=r.filter(e=>e!==t);const s={...a};r.length>0?s.additional=r:delete s.additional;const c={...o,badges:s};0===Object.keys(c.badges).length&&delete c.badges;const l={...n,groups_options:c};0===Object.keys(l.groups_options).length&&delete l.groups_options;const d={...this._config.areas_options,[e]:l};0===Object.keys(d[e]).length&&delete d[e];const h={...this._config,areas_options:d};h.areas_options&&0===Object.keys(h.areas_options).length&&delete h.areas_options,this._config=h,this._fireConfigChanged(h),this._refreshAreaCache(e)}_badgeShowNameChanged(e,t,i){if(!this._config||!this._hass)return;const n=this._config.areas_options?.[e]||{},o=n.groups_options||{},a=o.badges||{};let r=[...a.names_visible||[]],s=[...a.names_hidden||[]];const c=this._hass.states[t],l=c?.attributes?.device_class;i===(0,st.g7)(l)?(r=r.filter(e=>e!==t),s=s.filter(e=>e!==t)):i?(r.includes(t)||r.push(t),s=s.filter(e=>e!==t)):(r=r.filter(e=>e!==t),s.includes(t)||s.push(t));const d={...a};r.length>0?d.names_visible=r:delete d.names_visible,s.length>0?d.names_hidden=s:delete d.names_hidden;const h={...o,badges:d};0===Object.keys(h.badges).length&&delete h.badges;const p={...n,groups_options:h};0===Object.keys(p.groups_options).length&&delete p.groups_options;const u={...this._config.areas_options,[e]:p};0===Object.keys(u[e]).length&&delete u[e];const g={...this._config,areas_options:u};g.areas_options&&0===Object.keys(g.areas_options).length&&delete g.areas_options,this._config=g,this._fireConfigChanged(g),this._refreshAreaCache(e)}_addBadgeFromPicker(e,t){e.stopPropagation();const i=this.shadowRoot.querySelector(`.badge-entity-picker[data-area-id="${t}"]`);if(!i||!i.value)return;const n=i.value;this._badgeAdditionalChanged(t,n,!0),i.value=""}_getAreaOrder(){if(!this._hass)return[];const e=this._config.areas_display?.order;return e&&e.length>0?[...e]:Object.keys(this._hass.areas||{})}_updateAreaOrder(e){const t={...this._config,areas_display:{...this._config.areas_display,order:e}};this._config=t,this._fireConfigChanged(t)}_fireConfigChanged(e){this._isUpdatingConfig=!0;const t={...e};t.custom_views&&(t.custom_views=t.custom_views.map(e=>{const t={...e};return delete t._yaml_error,t})),t.custom_cards&&(t.custom_cards=t.custom_cards.map(e=>{const t={...e};return delete t._yaml_error,t})),t.custom_badges&&(t.custom_badges=t.custom_badges.map(e=>{const t={...e};return delete t._yaml_error,t})),this._config=t;const i=new CustomEvent("config-changed",{detail:{config:t},bubbles:!0,composed:!0});this.dispatchEvent(i),setTimeout(()=>{this._isUpdatingConfig=!1},0)}}function gt(e,t){const i=Object.values(t.devices||{}),n=Object.values(t.entities||{}),o=new Set;for(const t of i)t.area_id===e&&o.add(t.id);const a=[];for(const i of n){let n=!1;if(i.area_id?n=i.area_id===e:i.device_id&&o.has(i.device_id)&&(n=!0),!n)continue;if(i.hidden)continue;if(i.labels?.includes("no_dboard"))continue;const r=t.states[i.entity_id];if(!r)continue;const s=i.entity_id.split(".")[0]??"",c=r.attributes?.device_class,l=r.attributes?.unit_of_measurement;if((0,st.fF)(s,c,l,i.entity_id)){if("sensor"===s&&("battery"===c||i.entity_id.includes("battery"))){const e=parseFloat(r.state);!isNaN(e)&&e<20&&a.push(i.entity_id);continue}a.push(i.entity_id)}}return a}function _t(e,t){return t.areas_options?.[e]?.groups_options?.badges?.additional||[]}function mt(e,t,i,n){const o=Object.values(t.devices||{}),a=Object.values(t.entities||{}),r=new Set([...i,...n]),s=new Set;for(const t of o)t.area_id===e&&s.add(t.id);const c=[];for(const i of a){let n=!1;if(i.area_id?n=i.area_id===e:i.device_id&&s.has(i.device_id)&&(n=!0),!n)continue;if(i.hidden)continue;if(!t.states[i.entity_id])continue;const o=i.entity_id.split(".")[0];if("sensor"!==o&&"binary_sensor"!==o)continue;if(r.has(i.entity_id))continue;const a=t.states[i.entity_id];if(!a)continue;const l=a.attributes?.friendly_name||(i.entity_id.split(".")[1]??i.entity_id).replace(/_/g," ");c.push({entity_id:i.entity_id,name:l})}return c.sort((e,t)=>e.name.localeCompare(t.name)),c}function ft(e,t){const i=new Set;for(const n of e){const e=t.states[n];if(!e)continue;const o=e.attributes?.device_class;(0,st.g7)(o)&&i.add(n)}return i}function yt(e,t){const i=t.areas_options?.[e]?.groups_options?.badges;return{namesVisible:i?.names_visible||[],namesHidden:i?.names_hidden||[]}}function vt(e,t){const i=t.areas_options?.[e];if(!i||!i.groups_options)return{};const n={};for(const[e,t]of Object.entries(i.groups_options))t.hidden&&(n[e]=t.hidden);return n}function bt(e,t){const i=t.areas_options?.[e];if(!i||!i.groups_options)return{};const n={};for(const[e,t]of Object.entries(i.groups_options))t.order&&(n[e]=t.order);return n}ut.properties={_config:{state:!0},_expandedAreas:{state:!0},_expandedGroups:{state:!0}},ut.styles=n.AH`
    /* -- Base layout --------------------------------------------------- */
    .card-config {
      padding: 16px;
      font-family: var(--paper-font-body1_-_font-family, Roboto, sans-serif);
      font-size: var(--mdc-typography-body1-font-size, 14px);
      color: var(--primary-text-color);
    }
    .section {
      margin-bottom: 16px;
      background: var(--card-background-color, #fff);
      border: 1px solid var(--divider-color, #e8e8e8);
      border-radius: var(--ha-card-border-radius, 12px);
      padding: 16px;
      transition: box-shadow 0.2s ease;
    }
    .section-title {
      font-size: 15px;
      font-weight: 500;
      margin: 0 0 12px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid var(--divider-color, #e8e8e8);
      color: var(--primary-text-color);
      letter-spacing: 0.01em;
    }

    /* -- Form rows ----------------------------------------------------- */
    .form-row {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
    }
    .form-row input[type="checkbox"],
    .form-row input[type="radio"] {
      margin-right: 8px;
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: var(--primary-color);
    }
    .form-row input[type="checkbox"]:disabled,
    .form-row input[type="radio"]:disabled {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .form-row label {
      cursor: pointer;
      user-select: none;
      font-size: 14px;
      color: var(--primary-text-color);
    }
    .form-row label.disabled-label {
      cursor: not-allowed;
      opacity: 0.5;
    }
    .form-row .alarm-select {
      flex: 1;
      max-width: 300px;
    }
    .description {
      font-size: 12px;
      color: var(--secondary-text-color);
      margin: 2px 0 12px 26px;
      line-height: 1.4;
    }
    .description strong {
      font-weight: 600;
      color: var(--primary-text-color);
    }

    /* -- Native <select> — HA-like ------------------------------------- */
    select,
    .form-row select {
      cursor: pointer;
      font-family: inherit;
      font-size: 14px;
      padding: 10px 32px 10px 12px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      background-color: var(--card-background-color);
      color: var(--primary-text-color);
      appearance: none;
      -webkit-appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24'%3E%3Cpath fill='%236e6e6e' d='M7 10l5 5 5-5z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 10px center;
      background-size: 16px;
      transition: border-color 0.2s ease;
    }
    select:focus,
    .form-row select:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }
    select:hover,
    .form-row select:hover {
      border-color: var(--primary-color);
    }

    /* -- Native <input type="text/number"> — HA-like ------------------- */
    input[type="text"],
    input[type="number"] {
      font-family: inherit;
      font-size: 14px;
      padding: 10px 12px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      transition: border-color 0.2s ease;
      box-sizing: border-box;
    }
    input[type="text"]:focus,
    input[type="number"]:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }
    input[type="text"]:hover,
    input[type="number"]:hover {
      border-color: var(--primary-color);
    }
    input[type="text"]::placeholder {
      color: var(--secondary-text-color);
      opacity: 0.7;
    }

    /* -- Native <textarea> — YAML editors ------------------------------ */
    textarea {
      font-family: "Roboto Mono", "SFMono-Regular", "Consolas", "Liberation Mono", monospace;
      font-size: 12px;
      line-height: 1.5;
      padding: 12px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      resize: vertical;
      min-height: 80px;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
      tab-size: 2;
    }
    textarea:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }
    textarea:hover {
      border-color: var(--primary-color);
    }
    textarea::placeholder {
      color: var(--secondary-text-color);
      opacity: 0.7;
      font-family: inherit;
    }

    /* -- Buttons — HA-like --------------------------------------------- */
    button {
      font-family: inherit;
      font-size: 14px;
    }
    .btn-primary {
      padding: 10px 20px;
      border-radius: var(--ha-card-border-radius, 12px);
      border: none;
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      cursor: pointer;
      font-weight: 500;
      transition: opacity 0.2s ease, box-shadow 0.2s ease;
      white-space: nowrap;
    }
    .btn-primary:hover {
      opacity: 0.85;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.12);
    }
    .btn-primary:active {
      opacity: 0.75;
    }
    .btn-remove {
      padding: 6px 10px;
      border-radius: 8px;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--secondary-text-color);
      cursor: pointer;
      font-size: 14px;
      transition: color 0.2s ease, border-color 0.2s ease;
      line-height: 1;
    }
    .btn-remove:hover {
      color: var(--error-color, #db4437);
      border-color: var(--error-color, #db4437);
    }

    /* -- Area list ----------------------------------------------------- */
    .area-list {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
    }
    .area-item {
      border-bottom: 1px solid var(--divider-color);
      background: var(--card-background-color);
    }
    .area-item:last-child {
      border-bottom: none;
    }
    .area-item.dragging {
      opacity: 0.5;
    }
    .area-item.drag-over {
      border-top: 2px solid var(--primary-color);
    }
    .area-header {
      display: flex;
      align-items: center;
      padding: 12px 16px;
    }
    .drag-handle {
      margin-right: 12px;
      color: var(--secondary-text-color);
      cursor: grab;
      user-select: none;
      padding: 4px;
    }
    .drag-handle:active {
      cursor: grabbing;
    }
    .area-checkbox {
      margin-right: 12px;
      accent-color: var(--primary-color);
    }
    .area-name {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
    }
    .area-icon {
      margin-left: 8px;
      margin-right: 12px;
      color: var(--secondary-text-color);
    }
    .expand-button {
      background: none;
      border: none;
      padding: 4px 8px;
      cursor: pointer;
      color: var(--secondary-text-color);
      transition: transform 0.2s;
    }
    .expand-button:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .expand-button.expanded .expand-icon {
      transform: rotate(90deg);
    }
    .expand-icon {
      display: inline-block;
      transition: transform 0.2s;
    }
    .area-content {
      padding: 0 12px 12px 48px;
      background: var(--secondary-background-color);
    }
    .loading-placeholder {
      padding: 12px;
      text-align: center;
      color: var(--secondary-text-color);
      font-style: italic;
    }

    /* -- Section order list --------------------------------------------- */
    .section-order-list {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
    }
    .section-order-item {
      display: flex;
      align-items: center;
      padding: 12px 16px;
      border-bottom: 1px solid var(--divider-color);
      background: var(--card-background-color);
      transition: opacity 0.2s;
    }
    .section-order-item:last-child {
      border-bottom: none;
    }
    .section-order-item.dragging {
      opacity: 0.4;
    }
    .section-order-item.drag-over {
      border-top: 2px solid var(--primary-color);
    }
    .section-order-item.disabled {
      opacity: 0.5;
    }
    .section-order-item .drag-handle {
      margin-right: 12px;
      color: var(--secondary-text-color);
      cursor: grab;
      user-select: none;
      padding: 4px;
    }
    .section-order-item .drag-handle:active {
      cursor: grabbing;
    }
    .section-order-item .section-icon {
      margin-right: 10px;
      color: var(--secondary-text-color);
      --mdc-icon-size: 20px;
    }
    .section-order-item .section-label {
      flex: 1;
      font-size: 14px;
      font-weight: 500;
    }
    .section-order-item .section-hidden-tag {
      font-size: 12px;
      color: var(--secondary-text-color);
      font-style: italic;
      margin-left: 8px;
    }
    .section-order-item .section-toggle {
      margin-left: auto;
      cursor: pointer;
    }
    .section-order-item .section-toggle input {
      cursor: pointer;
      width: 16px;
      height: 16px;
    }
    .section-order-sub {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 16px 8px 56px;
      border-bottom: 1px solid var(--divider-color);
      font-size: 13px;
      color: var(--secondary-text-color);
    }
    .section-order-sub input {
      cursor: pointer;
    }
    .section-order-sub label {
      cursor: pointer;
    }

    /* -- Entity groups ------------------------------------------------- */
    .entity-groups {
      padding-top: 8px;
    }
    .entity-group {
      margin-bottom: 8px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: var(--card-background-color);
      overflow: hidden;
    }
    .entity-group-header {
      display: flex;
      align-items: center;
      padding: 10px 12px;
      cursor: pointer;
      user-select: none;
      transition: background-color 0.15s ease;
    }
    .entity-group-header:hover {
      background: var(--secondary-background-color);
    }
    .group-checkbox {
      margin-right: 8px;
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: var(--primary-color);
    }
    .group-checkbox[data-indeterminate="true"] {
      opacity: 0.6;
    }
    .entity-group-header ha-icon {
      margin-right: 8px;
      --mdc-icon-size: 18px;
      color: var(--secondary-text-color);
    }
    .group-name {
      flex: 1;
      font-weight: 500;
      font-size: 14px;
    }
    .entity-count {
      color: var(--secondary-text-color);
      font-size: 12px;
      margin-right: 8px;
    }
    .expand-button-small {
      background: none;
      border: none;
      padding: 4px;
      cursor: pointer;
      color: var(--secondary-text-color);
    }
    .expand-button-small.expanded .expand-icon-small {
      transform: rotate(90deg);
    }
    .expand-icon-small {
      display: inline-block;
      font-size: 12px;
      transition: transform 0.2s;
    }

    /* -- Entity list --------------------------------------------------- */
    .entity-list {
      padding: 8px 12px 8px 36px;
      border-top: 1px solid var(--divider-color);
    }
    .entity-item {
      display: flex;
      align-items: center;
      padding: 6px 0;
    }
    .entity-checkbox {
      margin-right: 8px;
      width: 16px;
      height: 16px;
      cursor: pointer;
      accent-color: var(--primary-color);
    }
    .entity-name {
      flex: 1;
      font-size: 14px;
    }
    .entity-id {
      font-size: 11px;
      color: var(--secondary-text-color);
      font-family: "Roboto Mono", monospace;
      margin-left: 8px;
    }
    .empty-state {
      padding: 24px;
      text-align: center;
      color: var(--secondary-text-color);
      font-style: italic;
    }

    /* -- Badge entity management --------------------------------------- */
    .badge-separator {
      padding: 8px 0 4px;
      font-size: 12px;
      font-weight: 500;
      color: var(--secondary-text-color);
      border-top: 1px dashed var(--divider-color);
      margin-top: 4px;
    }
    .badge-additional-item {
      padding-left: 0;
    }
    .badge-remove-btn {
      background: none;
      border: none;
      padding: 2px 6px;
      cursor: pointer;
      color: var(--error-color, #db4437);
      font-size: 14px;
      margin-left: 8px;
      border-radius: 4px;
      transition: background-color 0.15s ease;
    }
    .badge-remove-btn:hover {
      background: var(--secondary-background-color);
    }
    .badge-add-section {
      display: flex;
      gap: 8px;
      padding: 8px 0 4px;
      align-items: center;
    }
    .badge-entity-picker {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font-size: 13px;
    }
    .badge-add-button {
      padding: 8px 16px;
      border: none;
      border-radius: 8px;
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      transition: opacity 0.2s ease;
    }
    .badge-add-button:hover {
      opacity: 0.85;
    }
    .badge-name-checkbox {
      margin-left: auto;
      margin-right: 2px;
      width: 14px;
      height: 14px;
      cursor: pointer;
      accent-color: var(--primary-color);
    }
    .badge-name-label {
      font-size: 11px;
      color: var(--secondary-text-color);
      margin-right: 8px;
      white-space: nowrap;
    }

    /* -- Entity search picker ------------------------------------------ */
    .entity-search-picker {
      position: relative;
      flex: 1;
      min-width: 0;
    }
    .entity-search-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font-family: inherit;
      font-size: 14px;
      box-sizing: border-box;
      transition: border-color 0.2s ease;
    }
    .entity-search-input:focus {
      outline: none;
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }
    .entity-search-input::placeholder {
      color: var(--secondary-text-color);
      opacity: 0.7;
    }
    .entity-search-results {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      z-index: 10;
      margin-top: 4px;
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      background: var(--card-background-color);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
      overflow: hidden;
      max-height: 320px;
      overflow-y: auto;
    }
    .entity-search-result {
      display: flex;
      flex-direction: column;
      padding: 10px 14px;
      cursor: pointer;
      transition: background-color 0.1s ease;
      border-bottom: 1px solid var(--divider-color);
    }
    .entity-search-result:last-child {
      border-bottom: none;
    }
    .entity-search-result:hover {
      background: var(--secondary-background-color);
    }
    .entity-search-result .entity-search-name {
      font-size: 14px;
      font-weight: 500;
      color: var(--primary-text-color);
    }
    .entity-search-result .entity-search-id {
      font-size: 11px;
      color: var(--secondary-text-color);
      font-family: "Roboto Mono", monospace;
      margin-top: 2px;
    }
    .entity-search-no-results {
      padding: 12px 14px;
      color: var(--secondary-text-color);
      font-style: italic;
      font-size: 13px;
    }

    /* -- Favorites / Room Pins list items ------------------------------ */
    .entity-list-container {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      overflow: hidden;
    }
    .entity-list-item {
      display: flex;
      align-items: center;
      padding: 10px 14px;
      border-bottom: 1px solid var(--divider-color);
      background: var(--card-background-color);
      transition: background-color 0.1s ease;
    }
    .entity-list-item:last-child {
      border-bottom: none;
    }
    .entity-list-item:hover {
      background: var(--secondary-background-color);
    }
    .entity-list-item .drag-icon {
      margin-right: 12px;
      color: var(--secondary-text-color);
      font-size: 16px;
      cursor: grab;
      user-select: none;
      padding: 4px;
    }
    .entity-list-item .drag-icon:active {
      cursor: grabbing;
    }
    .entity-list-item.dragging {
      opacity: 0.5;
    }
    .entity-list-item.drag-over {
      border-top: 2px solid var(--primary-color);
    }
    .entity-list-item .item-info {
      flex: 1;
      min-width: 0;
      font-size: 14px;
    }
    .entity-list-item .item-name {
      font-weight: 500;
      color: var(--primary-text-color);
    }
    .entity-list-item .item-entity-id {
      margin-left: 8px;
      font-size: 12px;
      color: var(--secondary-text-color);
      font-family: "Roboto Mono", monospace;
    }
    .entity-list-item .item-area {
      display: block;
      font-size: 11px;
      color: var(--secondary-text-color);
      margin-top: 2px;
    }

    /* -- Custom view/card/badge items ---------------------------------- */
    .custom-item {
      border: 1px solid var(--divider-color);
      border-radius: var(--ha-card-border-radius, 12px);
      padding: 16px;
      margin-bottom: 12px;
      background: var(--card-background-color);
    }
    .custom-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }
    .custom-item-header strong {
      font-size: 14px;
      font-weight: 500;
    }
    .custom-item-fields {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .custom-card-target {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 13px;
    }
    .custom-card-target label {
      color: var(--secondary-text-color);
      white-space: nowrap;
    }
    .custom-card-target select {
      flex: 1;
      padding: 4px 8px;
      border: 1px solid var(--divider-color);
      border-radius: 4px;
      background: var(--card-background-color);
      color: var(--primary-text-color);
      font-size: 13px;
    }
    .custom-item-row {
      display: flex;
      gap: 8px;
    }
    .custom-item-validation {
      font-size: 12px;
      min-height: 16px;
    }

    /* -- Section dividers ---------------------------------------------- */
    .section-divider {
      margin: 28px 0 12px;
      padding: 0;
    }
    .section-divider-title {
      font-size: 13px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--secondary-text-color);
    }

    /* -- Mobile responsive --------------------------------------------- */
    @media (max-width: 600px) {
      .card-config {
        padding: 12px 8px;
      }
      .section {
        margin-bottom: 16px;
      }
      .section-title {
        font-size: 15px;
        margin-bottom: 8px;
      }
      .form-row {
        flex-wrap: wrap;
        gap: 4px;
      }
      .form-row label {
        font-size: 13px;
      }
      .description {
        margin-left: 26px;
        margin-bottom: 12px;
        font-size: 11px;
      }

      select,
      .form-row select {
        width: 100%;
        min-width: 0;
        font-size: 13px;
        padding: 8px 28px 8px 10px;
      }
      input[type="text"],
      input[type="number"] {
        width: 100%;
        font-size: 13px;
        padding: 8px 10px;
      }
      textarea {
        font-size: 11px;
        padding: 10px;
        min-height: 60px;
      }

      .entity-search-picker {
        width: 100%;
      }
      .entity-search-results {
        max-height: 240px;
      }
      .entity-search-result {
        padding: 8px 10px;
      }

      .area-header {
        padding: 10px 12px;
      }
      .area-content {
        padding: 0 8px 8px 24px;
      }
      .entity-list {
        padding: 6px 8px 6px 16px;
      }

      .custom-item {
        padding: 12px;
      }
      .custom-item-row {
        flex-direction: column;
      }

      .entity-list-item {
        padding: 8px 10px;
      }
      .entity-list-item .item-entity-id {
        display: block;
        margin-left: 0;
        margin-top: 2px;
      }

      .badge-add-section {
        flex-wrap: wrap;
      }

      .btn-primary {
        padding: 8px 16px;
        font-size: 13px;
      }
    }
  `,ut._sectionMeta=new Map([["overview",{icon:"mdi:home-outline",labelKey:"sections.overview"}],["custom_cards",{icon:"mdi:cards",labelKey:"sections.custom_cards"}],["areas",{icon:"mdi:floor-plan",labelKey:"sections.areas"}],["weather",{icon:"mdi:weather-partly-cloudy",labelKey:"sections.weather"}],["energy",{icon:"mdi:lightning-bolt",labelKey:"sections.energy"}],["plants",{icon:"mdi:flower-tulip",labelKey:"sections.plants"}],["agenda",{icon:"mdi:calendar",labelKey:"sections.agenda"}],["todos",{icon:"mdi:format-list-checks",labelKey:"sections.todos"}],["persons",{icon:"mdi:account-group",labelKey:"sections.persons"}],["vacuums",{icon:"mdi:robot-vacuum",labelKey:"sections.vacuums"}],["maintenance",{icon:"mdi:update",labelKey:"sections.maintenance"}]]),ut._DEVICE_CLASS_DEFAULTS={temperature:{icon:"mdi:thermometer",round:1},apparent_temperature:{icon:"mdi:thermometer-lines",round:1},humidity:{icon:"mdi:water-percent",round:0},moisture:{icon:"mdi:water-percent",round:0},pressure:{icon:"mdi:gauge",round:0},atmospheric_pressure:{icon:"mdi:gauge",round:0},wind_speed:{icon:"mdi:weather-windy",round:1},wind_direction:{icon:"mdi:compass",round:0},illuminance:{icon:"mdi:brightness-5",round:0},irradiance:{icon:"mdi:weather-sunny",round:0},precipitation:{icon:"mdi:weather-rainy",round:1},precipitation_intensity:{icon:"mdi:weather-pouring",round:1},voc:{icon:"mdi:cloud-outline",round:0},pm25:{icon:"mdi:weather-fog",round:0},pm10:{icon:"mdi:weather-fog",round:0},co2:{icon:"mdi:molecule-co2",round:0},co:{icon:"mdi:molecule-co",round:1},aqi:{icon:"mdi:air-filter",round:0},ozone:{icon:"mdi:cloud-outline",round:0},sulphur_dioxide:{icon:"mdi:cloud-outline",round:0},nitrogen_dioxide:{icon:"mdi:cloud-outline",round:0},nitrogen_monoxide:{icon:"mdi:cloud-outline",round:0},ammonia:{icon:"mdi:cloud-outline",round:0},distance:{icon:"mdi:ruler",round:1},speed:{icon:"mdi:speedometer",round:1},uv_index:{icon:"mdi:weather-sunny-alert",round:1}},ut._ICON_RE=/^[a-z]+:[a-z0-9-]+$/,customElements.define("simon42-dashboard-strategy-editor",ut)}}]);