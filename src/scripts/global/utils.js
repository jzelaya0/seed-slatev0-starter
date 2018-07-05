/*============================================================================
  Handleize
==============================================================================*/
theme.handleize = function(str) {
  return str
    .toLowerCase()
    .replace(/[^\w\u00C0-\u024f]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

/*============================================================================
  Atrribute to String
==============================================================================*/
theme.attributeToString = function(attribute) {
  if (typeof attribute !== "string") {
    attribute += "";
    if (attribute === "undefined") {
      attribute = "";
    }
  }
  return jQuery.trim(attribute);
};

/*============================================================================
  Thenable delay
==============================================================================*/
theme.delay = function(ms, data) {
  // delay a jquery deferred object
  var deferred = jQuery.Deferred();

  setTimeout(function() {
    if (!data) {
      deferred.resolve();
    } else {
      deferred.resolve(data);
    }
  }, ms);

  return deferred.promise();
};

/*============================================================================
  Fake promisify using jQuery.deferred
==============================================================================*/
theme.promisify = function(value) {
  var deferred = jQuery.Deferred();
  return deferred.resolve(value).promise();
};
