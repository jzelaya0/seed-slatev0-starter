/*============================================================================
  Ajax the add to cart experience by revealing it in a side drawer
  Plugin Documentation - http://shopify.github.io/Timber/#ajax-cart
  (c) Copyright 2015 Shopify Inc. Author: Carson Shold (@cshold). All Rights Reserved.

  This requires:
    - jQuery 1.8+
    - handlebars.min.js (for cart template)
    - modernizr.min.js
    - snippet/ajax-cart-template.liquid
==============================================================================*/

/*============================================================================
  Ajax Shopify Add To Cart
==============================================================================*/
var ajaxCart = (function(module, $) {
  'use strict';
  /*global ShopifyAPI, slate, theme, Handlebars, Shopify */

  // Private general variables
  var settings, isUpdating, $body;

  // Private plugin variables
  var $formContainer, $addToCart, $cartCountSelector, $cartCostSelector, $cartContainer;

  /*============================================================================
    PUBLIC METHODS - Initialise the plugin and define global options
  ==============================================================================*/
  function init(options) {

    // Default settings
    settings = {
      formSelector: 'form[action^="/cart/add"]',
      cartContainer: '#CartContainer',
      addToCartSelector: 'input[type="submit"]',
      cartCountSelector: null,
      cartCostSelector: null,
      moneyFormat: '${{amount}}',
      disableAjaxCart: false,
      enableQtySelectors: true
    };

    // Override defaults with arguments
    $.extend(settings, options);

    // Select DOM elements
    $formContainer = $(settings.formSelector);
    $cartContainer = $(settings.cartContainer);
    $addToCart = $formContainer.find(settings.addToCartSelector);

    $cartCountSelector = $(settings.cartCountSelector);
    $cartCostSelector = $(settings.cartCostSelector);

    // General Selectors
    $body = $(document.body);

    // Track cart activity status
    isUpdating = false;

    // Setup ajax quantity selectors on the any template if enableQtySelectors is true
    if (settings.enableQtySelectors) {
      _qtySelectors();
    }

    // Take over the add to cart form submit action if ajax enabled
    if (!settings.disableAjaxCart && $addToCart.length) {
      _formOverride();
    }

    // Run this function in case we're using the quantity selector outside of the cart
    _adjustCart();
  }

  function loadCart() {
    $body.addClass('drawer--is-loading');
    ShopifyAPI.getCart(_cartUpdateCallback);
  }

  /*============================================================================
    PRIVATE METHODS
  ==============================================================================*/
  function _updateCountPrice(cart) {
    if ($cartCountSelector) {
      $cartCountSelector.html(cart.item_count).removeClass('hidden-count');

      if (cart.item_count === 0) {
        $cartCountSelector.addClass('hidden-count');
      }
    }
    if ($cartCostSelector) {
      $cartCostSelector.html(slate.Currency.formatMoney(cart.total_price, settings.moneyFormat));
    }
  }

  function _formOverride() {
    $formContainer.on('submit', function(evt) {
      evt.preventDefault();

      // Add class to be styled if desired
      $addToCart.removeClass('is-added').addClass('is-adding');

      // Remove any previous quantity errors
      $('.qty-error').remove();

      ShopifyAPI.addItemFromForm(evt.target, _itemAddedCallback, _itemErrorCallback);
    });
  }

  function _itemAddedCallback() {
    $addToCart.removeClass('is-adding').addClass('is-added');

    ShopifyAPI.getCart(_cartUpdateCallback);
  }

  function _itemErrorCallback(XMLHttpRequest, textStatus) {
    var data = JSON.parse(XMLHttpRequest.responseText);
    $addToCart.removeClass('is-adding is-added');

    if (!!data.message) {
      if (data.status === 422) {
        $formContainer.after('<div class="errors qty-error">' + data.description + '</div>');
        console.log(data, textStatus);
      }
    }
  }

  function _cartUpdateCallback(cart) {
    // Update quantity and price
    _updateCountPrice(cart);
    _buildCart(cart);
  }

  function _buildCart(cart) {
    // Start with a fresh cart div
    $cartContainer.empty();

    // Show empty cart
    if (cart.item_count === 0) {
      $cartContainer
        .append('<p>' + theme.strings.emptyCart + '</p>');
      _cartCallback(cart);
      return;
    }

    // Handlebars.js cart layout
    var items = [],
      item = {},
      data = {},
      source = $("#CartTemplate").html(),
      template = Handlebars.compile(source);

    // Add each item to our handlebars.js data
    $.each(cart.items, function(index, cartItem) {

      /* Hack to get product image thumbnail
       *   - If image is not null
       *     - Remove file extension, add _small, and re-add extension
       *     - Create server relative link
       *   - A hard-coded url of no-image
       */
      if (cartItem.image != null) {
        var prodImg = cartItem.image.replace(/(\.[^.]*)$/, "_small$1").replace('http:', '');
      } else {
        var prodImg = "//cdn.shopify.com/s/assets/admin/no-image-medium-cc9732cb976dd349a0df1d39816fbcc7.gif";
      }

      // Create item's data object and add to 'items' array
      item = {
        key: cartItem.key,
        line: index + 1, // Shopify uses a 1+ index in the API
        url: cartItem.url,
        img: prodImg,
        name: cartItem.product_title,
        variation: cartItem.variant_title,
        properties: cartItem.properties,
        itemAdd: cartItem.quantity + 1,
        itemMinus: cartItem.quantity - 1,
        itemQty: cartItem.quantity,
        price: slate.Currency.formatMoney(cartItem.price, settings.moneyFormat),
        vendor: cartItem.vendor,
        linePrice: slate.Currency.formatMoney(cartItem.line_price, settings.moneyFormat),
        originalLinePrice: slate.Currency.formatMoney(cartItem.original_line_price, settings.moneyFormat),
        discounts: cartItem.discounts,
        discountsApplied: cartItem.line_price === cartItem.original_line_price ? false : true
      };

      items.push(item);
    });

    // Gather all cart data and add to DOM
    data = {
      items: items,
      note: cart.note,
      totalPrice: slate.Currency.formatMoney(cart.total_price, settings.moneyFormat),
      totalCartDiscount: cart.total_discount === 0 ? 0 : theme.strings.cartSavings + ' ' + slate.Currency.formatMoney(cart.total_discount, settings.moneyFormat),
      totalCartDiscountApplied: cart.total_discount === 0 ? false : true
    };

    $cartContainer.append(template(data));

    _cartCallback(cart);
  }

  function _cartCallback(cart) {
    $body.removeClass('drawer--is-loading');
    $body.trigger('afterCartLoad.ajaxCart', cart);

    if (window.Shopify && Shopify.StorefrontExpressButtons) {
      Shopify.StorefrontExpressButtons.initialize();
    }
  }

  function _adjustCart() {
    // Delegate all events because elements reload with the cart

    // Add or remove from the quantity
    $body.on('click', '.ajaxcart__qty-adjust', function() {
      if (isUpdating) {
        return;
      }

      var $el = $(this),
        line = $el.data('line'),
        $qtySelector = $el.siblings('.ajaxcart__qty-num'),
        qty = parseInt($qtySelector.val().replace(/\D/g, ''));

      var qty = _validateQty(qty);

      // Add or subtract from the current quantity
      if ($el.hasClass('ajaxcart__qty--plus')) {
        qty += 1;
      } else {
        qty -= 1;
        if (qty <= 0) qty = 0;
      }

      // If it has a data-line, update the cart.
      // Otherwise, just update the input's number
      if (line) {
        updateQuantity(line, qty);
      } else {
        $qtySelector.val(qty);
      }
    });

    // Update quantity based on input on change
    $body.on('change', '.ajaxcart__qty-num', function() {
      if (isUpdating) {
        return;
      }

      var $el = $(this),
        line = $el.data('line'),
        qty = parseInt($el.val().replace(/\D/g, ''));

      var qty = _validateQty(qty);

      // If it has a data-line, update the cart
      if (line) {
        updateQuantity(line, qty);
      }
    });

    // Prevent cart from being submitted while quantities are changing
    $body.on('submit', 'form.ajaxcart', function(evt) {
      if (isUpdating) {
        evt.preventDefault();
      }
    });

    // Highlight the text when focused
    $body.on('focus', '.ajaxcart__qty-adjust', function() {
      var $el = $(this);
      setTimeout(function() {
        $el.select();
      }, 50);
    });

    function updateQuantity(line, qty) {
      isUpdating = true;

      // Add activity classes when changing cart quantities
      var $row = $('.ajaxcart__row[data-line="' + line + '"]').addClass('is-loading');

      if (qty === 0) {
        $row.parent().addClass('is-removed');
      }

      // Slight delay to make sure removed animation is done
      setTimeout(function() {
        ShopifyAPI.changeItem(line, qty, _adjustCartCallback);
      }, 250);
    }

    // Save note anytime it's changed
    $body.on('change', 'textarea[name="note"]', function() {
      var newNote = $(this).val();

      // Update the cart note in case they don't click update/checkout
      ShopifyAPI.updateCartNote(newNote, function(cart) {});
    });
  }

  function _adjustCartCallback(cart) {
    // Update quantity and price
    _updateCountPrice(cart);

    // Reprint cart on short timeout so you don't see the content being removed
    setTimeout(function() {
      isUpdating = false;
      ShopifyAPI.getCart(_buildCart);
    }, 150);
  }

  function _qtySelectors() {
    // Change number inputs to JS ones, similar to ajax cart but without API integration.
    // Make sure to add the existing name and id to the new input element
    var numInputs = $('input[type="number"]');

    if (numInputs.length) {
      numInputs.each(function() {
        var $el = $(this),
          currentQty = $el.val(),
          inputName = $el.attr('name'),
          inputId = $el.attr('id');

        var itemAdd = currentQty + 1,
          itemMinus = currentQty - 1,
          itemQty = currentQty;

        var source = $("#JsQty").html(),
          template = Handlebars.compile(source),
          data = {
            key: $el.data('id'),
            itemQty: itemQty,
            itemAdd: itemAdd,
            itemMinus: itemMinus,
            inputName: inputName,
            inputId: inputId
          };

        // Append new quantity selector then remove original
        $el.after(template(data)).remove();
      });

      // Setup listeners to add/subtract from the input
      $('.js-qty__adjust').on('click', function() {
        var $el = $(this),
          id = $el.data('id'),
          $qtySelector = $el.siblings('.js-qty__num'),
          qty = parseInt($qtySelector.val().replace(/\D/g, ''));

        var qty = _validateQty(qty);

        // Add or subtract from the current quantity
        if ($el.hasClass('js-qty__adjust--plus')) {
          qty += 1;
        } else {
          qty -= 1;
          if (qty <= 1) qty = 1;
        }

        // Update the input's number
        $qtySelector.val(qty);
      });
    }
  }

  function _validateQty(qty) {
    if ((parseFloat(qty) === parseInt(qty)) && !isNaN(qty)) {
      // We have a valid number!
    } else {
      // Not a number. Default to 1.
      qty = 1;
    }
    return qty;
  }

  module = {
    init: init,
    load: loadCart
  };

  return module;

}(ajaxCart || {}, jQuery));

window.theme = window.theme || {};

theme.CartDrawer = new theme.Drawers('CartDrawer', 'right', {
  onDrawerOpen: ajaxCart.load
});

// Init ajax cart
ajaxCart.init({
  formSelector: '[data-product-form]',
  cartContainer: '#CartContainer',
  addToCartSelector: '[data-add-to-cart]',
  cartCountSelector: '[data-cart-count]',
  moneyFormat: theme.moneyFormat
});
// Bind to 'afterCartLoad.ajaxCart' to run any javascript after the cart has loaded in the DOM
jQuery(document.body).on('afterCartLoad.ajaxCart', function(evt, cart) {
  theme.CartDrawer.open();
});
