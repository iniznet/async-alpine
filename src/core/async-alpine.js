import * as strategies from './strategies/index.js';

const AsyncAlpine = {
  Alpine: null,

  // custom options, over-ridden by the second param of init
  _options: {
    prefix: 'ax-',
    alpinePrefix: 'x-',
    root: 'load',
    inline: 'load-src',
    defaultStrategy: 'immediate',
  },

  // data cache
  _data: {},

  // index for ID generation for event strategy
  _realIndex: -1,
  get _index() {
    return this._realIndex++;
  },

  /**
   * =================================
   * lifecycle
   * =================================
   */
  // initialise Alpine and options
  init(Alpine, opts = {}) {
    this.Alpine = Alpine;
    this._options = {
      ...this._options,
      ...opts,
    };
    return this;
  },

  // actually run stuff
  start() {
    this._processInline();
    this._setupComponents();
    this._mutations();
    return this;
  },

  /**
   * =================================
   * component registration
   * =================================
   */
  // register a component internally and a fake component with Alpine
  data(name, download = false) {
    this._data[name] = {
      loaded: false,
      download,
    };
    return this;
  },

  // declare the name of an inline component, we can add the download function later
  inline(name) {
    this.data(name);
    return this;
  },

  /**
   * =================================
   * process inline components
   * =================================
   */
  // loop through all elements with ax-load-src to process them
  _processInline() {
    const inlineComponents = document.querySelectorAll(`[${this._options.prefix}${this._options.inline}]`);
    for (const component of inlineComponents) {
      this._inlineElement(component);
    }
  },

  // process element to add the download function for this component
  _inlineElement(component) {
    const xData = component.getAttribute(`${this._options.prefix}data`);
    const srcUrl = component.getAttribute(`${this._options.prefix}${this._options.inline}`);
    if (!xData || !srcUrl) return;

    const name = this._parseName(xData);
    if (!this._data[name]) return;

    component.setAttribute(`${this._options.alpinePrefix}ignore`, "");
    component.setAttribute(`${this._options.alpinePrefix}data`, xData);
    component.removeAttribute(`${this._options.prefix}data`);

    component.removeAttribute(`[${this._options.prefix}${this._options.inline}]`);
    this._data[name].download = () => import(
      /* webpackIgnore: true */
      srcUrl
    );
  },

  /**
   * =================================
   * set up components
   * =================================
   */
  // loop through elements with ax-load and set them up as components
  _setupComponents() {
    const components = document.querySelectorAll(`[${this._options.prefix}${this._options.root}]`);
    for (let component of components) {
      this._setupComponent(component);
    }
  },

  // set this element up as a component
  _setupComponent(component) {
    const xData = component.getAttribute(`${this._options.prefix}data`);
    if (!xData) return;

    const name = this._parseName(xData);
    const strategy = component.getAttribute(`${this._options.prefix}${this._options.root}`) || this._options.defaultStrategy;

    component.setAttribute(`${this._options.alpinePrefix}ignore`, "");
    component.setAttribute(`${this._options.alpinePrefix}data`, xData);
    component.removeAttribute(`${this._options.prefix}data`);

    this._componentStrategy({
      name,
      strategy,
      el: component,
      id: component.id || this._index,
    });
  },

  /**
   * =================================
   * component strategies
   * =================================
   * split strategy into unique requirements and download the
   * component when requirements have been met
   */
  async _componentStrategy(component) {
    // split strategy into parts
    const requirements = component.strategy
      .split('|')
      .map(requirement => requirement.trim())
      .filter(requirement => requirement !== 'immediate')
      .filter(requirement => requirement !== 'eager');

    // if no requirements then load immediately
    if (!requirements.length) {
      await this._download(component.name);
      this._activate(component);
      return;
    }

    // set up promises for loading
    let promises = [];
    for (let requirement of requirements) {
      // idle using requestIdleCallback
      if (requirement === 'idle') {
        promises.push(strategies.idle());
        continue;
      }

      // visible using intersectionObserver
      if (requirement.startsWith('visible')) {
        promises.push(strategies.visible(component, requirement));
        continue;
      }

      // media query
      if (requirement.startsWith('media')) {
        promises.push(strategies.media(requirement));
        continue;
      }

      // event
      if (requirement === 'event') {
        promises.push(strategies.event(component));
      }
    }

    // wait for all promises (requirements) to resolve and then download component
    Promise.all(promises)
      .then(async () => {
        await this._download(component.name);
        this._activate(component);
      });
  },

  /**
   * =================================
   * component download
   * =================================
   */
  // check if the component has been downloaded, if not trigger download and register with Alpine
  async _download(name) {
    if (this._data[name].loaded) return;
    const module = await this._getModule(name);
    this.Alpine.data(name, module);
    this._data[name].loaded = true;
  },

  // run the callback function to get the module and find the appropriate import
  async _getModule(name) {
    if (!this._data[name]) return;

    const module = await this._data[name].download();

    // work out which export to use in order of preference:
    // name; default; first export
    let whichExport = module[name] || module.default || Object.values(module)[0] || false;
    return whichExport;
  },

  /**
   * =================================
   * component activation
   * =================================
   * first remove ax-load from the element to mark it as processed
   * get the content of x-data and remove the attribute
   * re-add it in a microtask to trigger an Alpine re-scan
   * remove x-ignore so Alpine activates it
   */
  _activate(component) {
    component.el.removeAttribute(`${this._options.prefix}${this._options.root}`);

    const xDataAttr = `${this._options.alpinePrefix}data`;
    const xData = component.el.getAttribute(xDataAttr);
    component.el.removeAttribute(xDataAttr);
    component.el.setAttribute(xDataAttr, xData);
    component.el.removeAttribute(`${this._options.alpinePrefix}ignore`);
    setTimeout(() => {
      this.Alpine.initTree(component.el);
    }, 1);
  },

  /**
   * =================================
   * mutation observer
   * =================================
   * watch for DOM mutations and set up added elements as new components
   */
  _mutations() {
    const observer = new MutationObserver(entries => {
      for (const entry of entries) {
        if (!entry.addedNodes) continue;
        for (const node of entry.addedNodes) {
          // only process element nodes
          if (node.nodeType !== 1) continue;

          // if this node doesn't have ax-load exit early
          if (!node.hasAttribute(`${this._options.prefix}${this._options.root}`)) continue;

          // if inline has been triggered and this element has inline src
          if (node.hasAttribute(`${this._options.prefix}${this._options.inline}`)) {
            this._inlineElement(node);
          }

          // setup component
          this._setupComponent(node);
        }
      }
    });
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });
  },

  /**
   * =================================
   * helpers
   * =================================
   */
  // take x-data content to parse out name 'output("test")' becomes 'output'
  _parseName(attribute) {
    return attribute.split('(')[0];
  },
};

export { AsyncAlpine };
