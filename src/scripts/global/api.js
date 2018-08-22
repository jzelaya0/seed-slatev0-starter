if ((typeof ShopifyAPI) === 'undefined') {
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
      type: 'POST',
      url: '/cart/update.js',
      data: 'note=' + theme.attributeToString(note),
      dataType: 'json',
      beforeSend: function() {
        $body.trigger('beforeUpdateCartNote.ajaxCart', note);
      },
      success: function(cart) {
        if ((typeof callback) === 'function') {
          callback(cart);
        } else {
          ShopifyAPI.onCartUpdate(cart);
        }
        $body.trigger('afterUpdateCartNote.ajaxCart', [note, cart]);
      },
      error: function(XMLHttpRequest, textStatus) {
        $body.trigger('errorUpdateCartNote.ajaxCart', [XMLHttpRequest, textStatus]);
        ShopifyAPI.onError(XMLHttpRequest, textStatus);
      },
      complete: function(jqxhr, text) {
        $body.trigger('completeUpdateCartNote.ajaxCart', [this, jqxhr, text]);
      }
    };
  jQuery.ajax(params);
};

ShopifyAPI.onError = function(XMLHttpRequest, textStatus) {
  var data = eval('(' + XMLHttpRequest.responseText + ')');
  if (!!data.message) {
    alert(data.message + '(' + data.status + '): ' + data.description);
  }
};

/*============================================================================
  POST to cart/add.js returns the JSON of the cart
    - Allow use of form element instead of just id
    - Allow custom error callback
==============================================================================*/
ShopifyAPI.addItemFromForm = function(form, callback, errorCallback) {
  var $body = $(document.body),
    params = {
      type: 'POST',
      url: '/cart/add.js',
      data: jQuery(form).serialize(),
      dataType: 'json',
      beforeSend: function(jqxhr, settings) {
        $body.trigger('beforeAddItem.ajaxCart', form);
      },
      success: function(line_item) {
        if ((typeof callback) === 'function') {
          callback(line_item, form);
        } else {
          ShopifyAPI.onItemAdded(line_item, form);
        }
        $body.trigger('afterAddItem.ajaxCart', [line_item, form]);
      },
      error: function(XMLHttpRequest, textStatus) {
        if ((typeof errorCallback) === 'function') {
          errorCallback(XMLHttpRequest, textStatus);
        } else {
          ShopifyAPI.onError(XMLHttpRequest, textStatus);
        }
        $body.trigger('errorAddItem.ajaxCart', [XMLHttpRequest, textStatus]);
      },
      complete: function(jqxhr, text) {
        $body.trigger('completeAddItem.ajaxCart', [this, jqxhr, text]);
      }
    };
  jQuery.ajax(params);
};

// Get from cart.js returns the cart in JSON
ShopifyAPI.getCart = function(callback) {
  $(document.body).trigger('beforeGetCart.ajaxCart');
  jQuery.getJSON('/cart.js', function(cart, textStatus) {
    if ((typeof callback) === 'function') {
      callback(cart);
    } else {
      ShopifyAPI.onCartUpdate(cart);
    }
    $(document.body).trigger('afterGetCart.ajaxCart', cart);
  });
};

// POST to cart/change.js returns the cart in JSON
ShopifyAPI.changeItem = function(line, quantity, callback) {
  var $body = $(document.body),
    params = {
      type: 'POST',
      url: '/cart/change.js',
      data: 'quantity=' + quantity + '&line=' + line,
      dataType: 'json',
      beforeSend: function() {
        $body.trigger('beforeChangeItem.ajaxCart', [line, quantity]);
      },
      success: function(cart) {
        if ((typeof callback) === 'function') {
          callback(cart);
        } else {
          ShopifyAPI.onCartUpdate(cart);
        }
        $body.trigger('afterChangeItem.ajaxCart', [line, quantity, cart]);
      },
      error: function(XMLHttpRequest, textStatus) {
        $body.trigger('errorChangeItem.ajaxCart', [XMLHttpRequest, textStatus]);
        ShopifyAPI.onError(XMLHttpRequest, textStatus);
      },
      complete: function(jqxhr, text) {
        $body.trigger('completeChangeItem.ajaxCart', [this, jqxhr, text]);
      }
    };
  jQuery.ajax(params);
};
