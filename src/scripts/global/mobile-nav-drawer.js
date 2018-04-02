/**
 * Mobile Navigation Script
 * ------------------------------------------------------------------------------
 */

theme.MobileNav = (function() {
	var selectors = {
		mobileNavDrawer: '#MobileNavDrawer'
	};
	var cache = {};

	function init() {
		cacheSelectors();
		initDrawer();
	}

	function cacheSelectors() {
		cache = {
			mobileNavDrawer: $(selectors.mobileNavDrawer)
		};
	}

	function initDrawer() {
		// Add required classes to HTML
		$('#PageContainer').addClass('drawer-page-content');
		$('.js-drawer-open-left')
			.attr('aria-controls', 'MobileNavDrawer')
			.attr('aria-expanded', 'false');

		theme.MobileNavDrawer = new theme.Drawers('MobileNavDrawer', 'left');
	}

	return {
		init: init
	};
})();
