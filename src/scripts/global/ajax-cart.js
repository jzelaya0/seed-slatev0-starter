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
theme.AjaxCart = (function() {
  "use strict";

  // Public functions
  var init, loadCart;

  // Private general variables
  var settings, isUpdating, $body;

  // Private plugin variables
  var $formContainer,
    $addToCart,
    $cartCountSelector,
    $cartCostSelector,
    $cartContainer;

  // Handle Events (add, remove, adjust etc.)
  var watchCartActions, watchCartState;

  // Private functions
  var initAjaxQtySelectors, initQtySelectors;

  // Callbacks
  var updateCountPrice, itemErrorCallback, cartUpdateCallback, buildCart;

  // Helpers
  var validateQty;

  /*============================================================================
      Initialise the plugin and define global options
    ==============================================================================*/

  // public functions

  init = function(options) {
    // Default settings
    settings = {
      formSelector: 'form[action^="/cart/add"]',
      cartContainer: "#CartContainer",
      addToCartSelector: 'input[type="submit"]',
      cartCountSelector: null,
      cartCostSelector: null,
      moneyFormat: "${{amount}}",
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
    console.log($addToCart);
    // General Selectors
    $body = $(document.body);

    // Track cart activity status
    isUpdating = false;

    // Replace normal qty with js qty selectors
    if (settings.enableQtySelectors) {
      initQtySelectors();
    }

    // Init ajax qty selectors
    initAjaxQtySelectors();

    // listen add, remove, and adjust events
    watchCartActions();

    // style cart during different states
    watchCartState();
  };

  loadCart = function() {
    ShopifyAPI.getCart(cartUpdateCallback);
  };

  // private functions

  // product page js qty selectors
  initQtySelectors = function() {
    // Change number inputs to JS ones, similar to ajax cart but without API integration.
    // Make sure to add the existing name and id to the new input element
    var numInputs = $('input[type="number"]');

    if (numInputs.length) {
      numInputs.each(function() {
        var $el = $(this),
          currentQty = $el.val(),
          inputName = $el.attr("name"),
          inputId = $el.attr("id"),
          key = $el.data("id"),
          productId = $el.data("product-id"),
          limit = $el.data("limit");

        var itemAdd = currentQty + 1,
          itemMinus = currentQty - 1,
          itemQty = currentQty;

        var source = $("#JsQty").html(),
          template = Handlebars.compile(source),
          data = {
            key: key,
            itemQty: itemQty,
            itemAdd: itemAdd,
            itemMinus: itemMinus,
            inputName: inputName,
            inputId: inputId,
            productId: productId,
            limit: limit
          };

        // Append new quantity selector then remove original
        $el.after(template(data)).remove();
      });

      // Setup listeners to add/subtract from the input
      $(".js-qty__adjust").on("click", function() {
        var $el = $(this),
          id = $el.data("id"),
          $qtySelector = $el.siblings(".js-qty__num"),
          qty = parseInt($qtySelector.val().replace(/\D/g, ""));

        var qty = validateQty(qty);

        // Add or subtract from the current quantity
        if ($el.hasClass("js-qty__plus")) {
          qty += 1;
        } else {
          qty -= 1;
          if (qty <= 1) qty = 1;
        }

        // Update the input's number
        $qtySelector.val(qty);
      });
    }
  };

  // ajax cart qty selectors
  initAjaxQtySelectors = function() {
    // Adjust displaying qty and trigger the change event
    $body.on("click", ".ajaxcart__qty-adjust", function() {
      if (isUpdating) {
        return;
      }

      var $el = $(this),
        $row = $(this).closest(".ajaxcart__row"),
        line = $el.data("line"),
        $qtySelector = $el.siblings(".ajaxcart__qty-num"),
        qty = validateQty(parseInt($qtySelector.val().replace(/\D/g, "")));

      // Add or subtract from the current quantity
      if ($el.hasClass("ajaxcart__qty-plus")) {
        qty += 1;
      } else {
        qty -= 1;
        if (qty <= 0) qty = 0;
      }

      // update the input's number
      $qtySelector.val(qty, $el);

      // Trigger the change event
      $qtySelector.trigger("change", [line, qty]);
    });

    // Highlight the text when focused
    $body.on("focus", ".ajaxcart__qty-adjust", function() {
      var $el = $(this);
      setTimeout(function() {
        $el.select();
      }, 50);
    });
  };

  // register cart change event listeners
  watchCartActions = function() {
    // Add items out of the ajax cart
    // Take over the add to cart form submit action if ajax enabled
    if (!settings.disableAjaxCart && $addToCart.length) {
      $formContainer.on("submit", function(evt) {
        evt.preventDefault();

        // Prevent cart from being submitted while quantities are changing
        if (isUpdating) {
          return;
        }

        $body.trigger("beforeCartChange.ajaxCart");
        var $form = $(evt.target),
          $input = $form.find("[data-limit]"),
          productId = $input.data("product-id"),
          qty = parseInt($input.val());

        var data = $form.serialize();

        ShopifyAPI.addItem(data, null, itemErrorCallback).then(function(cart) {
          cartUpdateCallback(cart);
          $body.trigger("afterCartChange.ajaxCart", cart);
        });
      });
    }

    // Delegate all events because elements reload with the cart

    // Remove items
    $body.on("click", ".ajaxcart__btn-remove", function(evt) {
      evt.preventDefault();

      if (isUpdating) {
        return;
      }

      var id = $(this).data("id"),
        $row = $(this).closest(".ajaxcart__row"),
        line = $row.data("line"),
        qty = 0;

      $body.trigger("beforeCartChange.ajaxCart", [$row, qty]);
      // Slight delay to make sure removed animation is done
      ShopifyAPI.changeItem(line, qty).then(function(cart) {
        // Reprint cart on short timeout so you don't see the content being removed
        theme.delay(300).then(function() {
          updateCountPrice(cart);
          cartUpdateCallback(cart);
          $body.trigger("afterCartChange.ajaxCart", cart);
        });
      });
    });

    // Adjust qty
    $body.on("change", ".ajaxcart__qty-num", function(evt, line, qty) {
      var $row = $('.ajaxcart__row[data-line="' + line + '"]');

      // if the event is triggered by the input instead of the qty adjust buttons
      if (!qty) {
        var $input = $(evt.target);
        qty = parseInt($input.val());
      }

      if (!line) {
        line = parseInt($(evt.target).data("line"));
      }

      $body.trigger("beforeCartChange.ajaxCart", [$row, qty]);

      // Slight delay to make sure removed animation is done
      ShopifyAPI.changeItem(line, qty).then(function(cart) {
        // Reprint cart on short timeout so you don't see the content being removed
        theme.delay(300).then(function() {
          updateCountPrice(cart);
          cartUpdateCallback(cart);
          $body.trigger("afterCartChange.ajaxCart", cart);
        });
      });
    });

    // Submit ajax cart
    $body.on("submit", "form.ajaxcart", function(evt) {
      if (isUpdating) {
        evt.preventDefault();
      }
    });

    // Save note anytime it's changed
    // $body.on('change', 'textarea[name="note"]', function() {
    //   var newNote = $(this).val();

    //   // Update the cart note in case they don't click update/checkout
    //   ShopifyAPI.updateCartNote(newNote, function(cart) {});
    // });
  };

  // register cart state change event listeners
  watchCartState = function() {
    // change add to cart button style
    $body.on("beforeAddItem.ajaxCart", function() {
      isUpdating = true;
      // Remove any previous quantity errors
      $(".qty-error").remove();

      // Add class to be styled if desired
      $addToCart.removeClass("is-added").addClass("is-adding");
    });

    $body.on("completeAddItem.ajaxCart", function() {
      $addToCart.removeClass("is-adding").addClass("is-added");
      isUpdating = false;
    });

    // change drawer style
    $body.on("beforeCartChange.ajaxCart", function(evt, $row, qty) {
      isUpdating = true;

      if (qty == 0) {
        $row.addClass("is-removing");
      }

      // show spinner
      $body.addClass("drawer--is-loading");
    });

    $body.on("afterCartChange.ajaxCart", function() {
      // hide spinner
      $body.removeClass("drawer--is-loading");

      isUpdating = false;
    });
  };

  // callbacks

  cartUpdateCallback = function(cart) {
    // Update quantity and price icons
    updateCountPrice(cart);

    //build cart
    buildCart(cart);

    //init paypal button
    if (window.Shopify && Shopify.StorefrontExpressButtons) {
      Shopify.StorefrontExpressButtons.initialize();
    }
  };

  updateCountPrice = function(cart) {
    if ($cartCountSelector) {
      $cartCountSelector.html(cart.item_count).removeClass("hide");

      if (cart.item_count === 0) {
        // $cartCountSelector.addClass('hide');
      }
    }

    if ($cartCostSelector) {
      $cartCostSelector.html(
        slate.Currency.formatMoney(cart.total_price, settings.moneyFormat)
      );
    }
  };

  buildCart = function(cart) {
    // Start with a fresh cart div
    $cartContainer.empty();

    // Show empty cart
    if (cart.item_count === 0) {
      $cartContainer.append(
        '<p class="ajaxcart__empty-message">You have no items in your shopping cart.</p>'
      );
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
      var sizedImage = cartItem.image
        ? slate.Image.getSizedImageUrl(cartItem.image, "90x")
        : "";

      // Create item's data object and add to 'items' array
      item = {
        key: cartItem.key,
        line: index + 1, // Shopify uses a 1+ index in the API
        url: cartItem.url,
        img: sizedImage,
        name: cartItem.product_title,
        productId: cartItem.product_id,
        variantId: cartItem.variant_id,
        variation: cartItem.variant_title,
        properties: cartItem.properties,
        itemAdd: cartItem.quantity + 1,
        itemMinus: cartItem.quantity - 1,
        itemQty: cartItem.quantity,
        price: slate.Currency.formatMoney(cartItem.price, settings.moneyFormat),
        type: cartItem.product_type,
        vendor: cartItem.vendor,
        linePrice: slate.Currency.formatMoney(
          cartItem.line_price,
          settings.moneyFormat
        ),
        originalLinePrice: slate.Currency.formatMoney(
          cartItem.original_line_price,
          settings.moneyFormat
        ),
        discounts: cartItem.discounts,
        discountsApplied:
          cartItem.line_price === cartItem.original_line_price ? false : true
      };

      items.push(item);
    });

    // Gather all cart data and add to DOM
    data = {
      items: items,
      note: cart.note,
      totalPrice: slate.Currency.formatMoney(
        cart.total_price,
        settings.moneyFormat
      ),
      totalCartDiscount:
        cart.total_discount === 0
          ? 0
          : "Savings" +
            slate.Currency.formatMoney(
              cart.total_discount,
              settings.moneyFormat
            ),
      totalCartDiscountApplied: cart.total_discount === 0 ? false : true
    };

    $cartContainer.append(template(data));
  };

  itemErrorCallback = function(XMLHttpRequest, textStatus) {
    var data = eval("(" + XMLHttpRequest.responseText + ")");
    $addToCart.removeClass("is-adding is-added");

    if (!!data.message) {
      if (data.status == 422) {
        $formContainer.after(
          '<div class="errors qty-error">' + data.description + "</div>"
        );
      }
    }
  };

  // helpers

  validateQty = function(qty) {
    if (parseFloat(qty) == parseInt(qty) && !isNaN(qty)) {
      // We have a valid number!
    } else {
      // Not a number. Default to 1.
      qty = 1;
    }
    return qty;
  };

  return { init: init, load: loadCart };
})();

theme.initAjaxCart = function() {
  // init ajax cart
  jQuery(function($) {
    theme.AjaxCart.init({
      formSelector: "[data-product-form]",
      cartContainer: "#CartBody",
      addToCartSelector: "[data-add-to-cart]",
      cartCountSelector: ".js-cart-count span",
      enableQtySelectors: true,
      moneyFormat: "${{amount}}"
    });

    // if it's cart page
    if ($(document.body).hasClass("template-cart")) {
      $(".js-ajaxcart-open").on("click", function() {
        window.location.href = "/cart";
      });

      // if it's not cart page
    } else {
      // init drawer
      theme.CartDrawer = new theme.Drawers("CartDrawer", "right");

      // Build cart on load, because the first build is slow
      theme.AjaxCart.load();

      // bind open
      $(document.body).on("completeAddItem.ajaxCart", function() {
        theme.CartDrawer.open();
      });

      $(".js-ajaxcart-open").on(
        "click",
        theme.CartDrawer.open.bind(theme.CartDrawer)
      );

      // bind close
      $(document.body).on(
        "click",
        ".js-ajaxcart-close",
        theme.CartDrawer.close.bind(theme.CartDrawer)
      );
    }
  });
};
