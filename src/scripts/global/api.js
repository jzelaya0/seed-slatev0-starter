/**
 * API Functions
 * Customized version of Shopify's jQuery API
 * (c) Copyright 2009 - 2015 Shopify Inc.Author: Caroline Schnapp.All Rights Reserved.
 *
 * @namespace ShopifyAPI
 */

window.ShopifyAPI = window.ShopifyAPI || {};

/**
 * Update cart note
 *
 * @param {String} note
 * @param {Function} callback
 * @returns {jqXHR}
 */
ShopifyAPI.updateCartNote = function(note, callback) {
  var $body = $(document.body),
    params = {
      type: "POST",
      url: "/cart/update.js",
      data: "note=" + theme.attributeToString(note),
      dataType: "json",
      beforeSend: function() {
        $body.trigger("beforeUpdateCartNote.ajaxCart", note);
      },
      success: function(cart) {
        if (typeof callback === "function") {
          callback(cart);
        }
        $body.trigger("afterUpdateCartNote.ajaxCart", [note, cart]);
      },
      error: function(XMLHttpRequest, textStatus) {
        $body.trigger("errorUpdateCartNote.ajaxCart", [
          XMLHttpRequest,
          textStatus
        ]);
        ShopifyAPI.onError(XMLHttpRequest, textStatus);
      },
      complete: function(jqxhr, text) {
        $body.trigger("completeUpdateCartNote.ajaxCart", [this, jqxhr, text]);
      }
    };
  jQuery.ajax(params);
};

/**
 * Error callback
 *
 * @param {Object} XMLHttpRequest
 * @param {String} textStatus
 */
ShopifyAPI.onError = function(XMLHttpRequest, textStatus) {
  var data = eval("(" + XMLHttpRequest.responseText + ")");
  if (!!data.message) {
    alert(data.message + "(" + data.status + "): " + data.description);
  }
};

/**
 * Add a single item
 * When adding multiple items, we have to chain each ajax call
 *
 * @param {Object} data
 * @param {Function} callback
 * @param {Function} errorCallback
 * @returns {jqXHR}
 */
ShopifyAPI.addItem = function(data, callback, errorCallback) {
  var $body = $(document.body),
    params = {
      type: "POST",
      url: "/cart/add.js",
      data: data,
      dataType: "json",
      beforeSend: function() {
        $(document.body).trigger("beforeAddItem.ajaxCart", data);
      },
      success: function(lineItem) {
        if (typeof callback === "function") {
          callback(lineItem);
        }

        $body.trigger("afterAddItem.ajaxCart", [lineItem]);
      },
      error: function(XMLHttpRequest, textStatus) {
        if (typeof errorCallback === "function") {
          errorCallback(XMLHttpRequest, textStatus);
        } else {
          ShopifyAPI.onError(XMLHttpRequest, textStatus);
        }
        $body.trigger("errorAddItem.ajaxCart", [XMLHttpRequest, textStatus]);
      },
      complete: function(jqxhr, text) {
        $body.trigger("completeAddItem.ajaxCart", [this, jqxhr, text]);
      }
    };

  return ShopifyAPI.promiseChange(params);
};

/**
 * Get cart
 *
 * @param {Function} callback
 * @param {Function} errorCallback
 * @returns {jqXHR}
 */
ShopifyAPI.getCart = function(callback, errorCallback) {
  var $body = $(document.body),
    params = {
      type: "GET",
      url: "/cart.js",
      dataType: "json",
      beforeSend: function() {
        $body.trigger("beforeGetCart.ajaxCart");
      },
      success: function(cart) {
        if (typeof callback === "function") {
          callback(cart);
        }

        $body.trigger("afterGetCart.ajaxCart", cart);
      },
      error: function(XMLHttpRequest, textStatus) {
        if (typeof errorCallback === "function") {
          errorCallback(XMLHttpRequest, textStatus);
        } else {
          ShopifyAPI.onError(XMLHttpRequest, textStatus);
        }
        $body.trigger("errorGetCart.ajaxCart", [XMLHttpRequest, textStatus]);
      },
      complete: function(jqxhr, text) {
        $body.trigger("completeGetCart.ajaxCart", [this, jqxhr, text]);
      }
    };

  return jQuery.ajax(params);
};

/**
 * Update cart
 *
 * @param {Object} data
 * @param {Function} callback
 * @param {Function} errorCallback
 * @returns {jqXHR}
 */
ShopifyAPI.updateCart = function(data, callback, errorCallback) {
  var $body = $(document.body),
    params = {
      type: "POST",
      url: "/cart/update.js",
      data: {
        updates: data
      },
      dataType: "json",
      beforeSend: function() {
        $body.trigger("beforeUpdateItems.ajaxCart", data);
      },
      success: function(cart) {
        if (typeof callback === "function") {
          callback(cart);
        }

        $body.trigger("afterUpdateItems.ajaxCart", caert);
      },
      error: function(XMLHttpRequest, textStatus) {
        if (typeof errorCallback === "function") {
          errorCallback(XMLHttpRequest, textStatus);
        } else {
          ShopifyAPI.onError(XMLHttpRequest, textStatus);
        }
        $body.trigger("errorUpdateItems.ajaxCart", [
          XMLHttpRequest,
          textStatus
        ]);
      },
      complete: function(jqxhr, text) {
        $body.trigger("completeUpdateItems.ajaxCart", [this, jqxhr, text]);
      }
    };

  return ShopifyAPI.promiseChange(params);
};

/**
 * Change a line item
 *
 * @param {Number} line
 * @param {Number} quantity
 * @param {Function} callback
 * @param {Function} errorCallback
 * @returns {jqXHR}
 */
ShopifyAPI.changeItem = function(line, quantity, callback, errorCallback) {
  var $body = $(document.body),
    params = {
      type: "POST",
      url: "/cart/change.js",
      data: "quantity=" + quantity + "&line=" + line,
      dataType: "json",
      beforeSend: function() {
        $body.trigger("beforeChangeItem.ajaxCart", [line, quantity]);
      },
      success: function(cart) {
        if (typeof callback === "function") {
          callback(cart);
        }

        $body.trigger("afterChangeItem.ajaxCart", [cart, line, quantity]);
      },
      error: function(XMLHttpRequest, textStatus) {
        if (typeof errorCallback === "function") {
          errorCallback(XMLHttpRequest, textStatus);
        } else {
          ShopifyAPI.onError(XMLHttpRequest, textStatus);
        }
        $body.trigger("errorChangeItem.ajaxCart", [XMLHttpRequest, textStatus]);
      },
      complete: function(jqxhr, text) {
        $body.trigger("completeChangeItem.ajaxCart", [this, jqxhr, text]);
      }
    };

  return ShopifyAPI.promiseChange(params);
};

/**
 * Get cart after the ajaxcall and store it to localState
 *
 * @param {Object} params - jQuery ajax call parameters
 * @returns {jqXHR}
 */
ShopifyAPI.promiseChange = function(params) {
  var promiseRequest = $.ajax(params);

  return (
    promiseRequest
      // Some cart API requests don't return the cart object. If there is no cart object then get one before proceeding.
      .then(function(state) {
        if (typeof state.token === "undefined") {
          return ShopifyAPI.getCart();
        } else {
          return state;
        }
      })
      .then(function(state) {
        localStorage.shopify_cart_state = JSON.stringify(state);

        return state;
      })
  );
};
