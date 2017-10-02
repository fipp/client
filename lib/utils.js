'use strict';

const { URL } = require('url');

/**
  * Constructs an absolute content URI out of a manifest URI
  * and a relative content URI
  *
  * @param {String} input Relative content URI
  * @param {String} base Absolute manifest URI
  *
  * @returns {String} an absolute content URI
  */

module.exports.uriBuilder = (input = '', base = '', extra = '') => {
    const uriObj = new URL(base);
    const inputPath = input.split('/').filter(item => item);
    const basePath = uriObj.pathname
        .split('/')
        .filter(item => item && !item.includes('.json'));
    const extraPath = extra.split('/').filter(item => item);

    uriObj.pathname = basePath.concat(inputPath, extraPath).join('/');
    return uriObj.toString();
};

/**
  * Checks if a URI is relative
  *
  * @param {String} uri A URI to check
  *
  * @returns {Boolean}
  */

module.exports.uriIsRelative = uri => uri.substr(0, 4) !== 'http';