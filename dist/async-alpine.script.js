var u=t=>new Promise(e=>{window.addEventListener("async-alpine:load",s=>{s.detail.id===t.id&&e()})}),a=u;var h=()=>new Promise(t=>{"requestIdleCallback"in window?window.requestIdleCallback(t):setTimeout(t,200)}),l=h;var f=t=>new Promise(e=>{let s=t.indexOf("("),i=t.slice(s),n=window.matchMedia(i);n.matches?e():n.addEventListener("change",e,{once:!0})}),d=f;var _=(t,e)=>new Promise(s=>{let i="0px 0px 0px 0px";if(e.indexOf("(")!==-1){let o=e.indexOf("(")+1;i=e.slice(o,-1)}let n=new IntersectionObserver(o=>{o[0].isIntersecting&&(n.disconnect(),s())},{rootMargin:i});n.observe(t.el)}),p=_;var r={Alpine:null,_options:{prefix:"ax-",alpinePrefix:"x-",root:"load",inline:"load-src",defaultStrategy:"immediate"},_data:{},_realIndex:-1,get _index(){return this._realIndex++},init(t,e={}){return this.Alpine=t,this._options={...this._options,...e},this},start(){return this._processInline(),this._setupComponents(),this._mutations(),this},data(t,e=!1){return this._data[t]={loaded:!1,download:e},this},inline(t){return this.data(t),this},_processInline(){let t=document.querySelectorAll(`[${this._options.prefix}${this._options.inline}]`);for(let e of t)this._inlineElement(e)},_inlineElement(t){let e=t.getAttribute(`${this._options.prefix}data`),s=t.getAttribute(`${this._options.prefix}${this._options.inline}`);if(!e||!s)return;let i=this._parseName(e);!this._data[i]||(t.setAttribute(`${this._options.alpinePrefix}ignore`,""),t.setAttribute(`${this._options.alpinePrefix}data`,e),t.removeAttribute(`${this._options.prefix}data`),t.removeAttribute(`[${this._options.prefix}${this._options.inline}]`),this._data[i].download=()=>import(s))},_setupComponents(){let t=document.querySelectorAll(`[${this._options.prefix}${this._options.root}]`);for(let e of t)this._setupComponent(e)},_setupComponent(t){let e=t.getAttribute(`${this._options.prefix}data`);if(!e)return;let s=this._parseName(e),i=t.getAttribute(`${this._options.prefix}${this._options.root}`)||this._options.defaultStrategy;t.setAttribute(`${this._options.alpinePrefix}ignore`,""),t.setAttribute(`${this._options.alpinePrefix}data`,e),t.removeAttribute(`${this._options.prefix}data`),this._componentStrategy({name:s,strategy:i,el:t,id:t.id||this._index})},async _componentStrategy(t){let e=t.strategy.split("|").map(i=>i.trim()).filter(i=>i!=="immediate").filter(i=>i!=="eager");if(!e.length){await this._download(t.name),this._activate(t);return}let s=[];for(let i of e){if(i==="idle"){s.push(l());continue}if(i.startsWith("visible")){s.push(p(t,i));continue}if(i.startsWith("media")){s.push(d(i));continue}i==="event"&&s.push(a(t))}Promise.all(s).then(async()=>{await this._download(t.name),this._activate(t)})},async _download(t){if(this._data[t].loaded)return;let e=await this._getModule(t);this.Alpine.data(t,e),this._data[t].loaded=!0},async _getModule(t){if(!this._data[t])return;let e=await this._data[t].download();return e[t]||e.default||Object.values(e)[0]||!1},_activate(t){t.el.removeAttribute(`${this._options.prefix}${this._options.root}`);let e=`${this._options.alpinePrefix}data`,s=t.el.getAttribute(e);t.el.removeAttribute(e),t.el.setAttribute(e,s),t.el.removeAttribute(`${this._options.alpinePrefix}ignore`),setTimeout(()=>{this.Alpine.initTree(t.el)},1)},_mutations(){new MutationObserver(e=>{for(let s of e)if(!!s.addedNodes)for(let i of s.addedNodes)i.nodeType===1&&(!i.hasAttribute(`${this._options.prefix}${this._options.root}`)||(i.hasAttribute(`${this._options.prefix}${this._options.inline}`)&&this._inlineElement(i),this._setupComponent(i)))}).observe(document.body,{attributes:!0,childList:!0,subtree:!0})},_parseName(t){return t.split("(")[0]}};document.addEventListener("alpine:init",()=>{window.AsyncAlpine=r,r.init(Alpine),document.dispatchEvent(new CustomEvent("async-alpine:init")),r.start()});
