/*============================================================================
  Customized version of Shopify's jQuery API
  (c) Copyright 2009 - 2015 Shopify Inc.Author: Caroline Schnapp.All Rights Reserved.
==============================================================================*/

if (typeof ShopifyAPI === "undefined") {
  ShopifyAPI = {};
}

/*============================================================================
  API Functions
==============================================================================*/
ShopifyAPI.onCartUpdate = function(cart) {
  // alert('There are now ' + cart.item_count + ' items in the cart.');
};

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
        } else {
          ShopifyAPI.onCartUpdate(cart);
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

ShopifyAPI.onError = function(XMLHttpRequest, textStatus) {
  var data = eval("(" + XMLHttpRequest.responseText + ")");
  if (!!data.message) {
    alert(data.message + "(" + data.status + "): " + data.description);
  }
};

// Add item using form element instead of just id
ShopifyAPI.addItemFromForm = function(data, callback, errorCallback) {
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

  return jQuery.when(ShopifyAPI.promiseChange(params));
};

// Get from cart.js returns the cart in JSON
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

  return jQuery.when(jQuery.ajax(params));
};

// Update cart, bulk change cart items
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

  return jQuery.when(ShopifyAPI.promiseChange(params));
};

// POST to cart/change.js returns the cart in JSON
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

  return jQuery.when(ShopifyAPI.promiseChange(params));
};

ShopifyAPI.promiseChange = function(params) {
  var promiseRequest = $.ajax(params);

  return (
    promiseRequest
      // Some cart API requests don't return the cart object. If there is no
      // cart object then get one before proceeding.
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
