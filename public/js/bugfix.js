if( typeof document.defaultView == 'undefined') {
	document.defaultView = {};

	document.defaultView.getComputedStyle = function(element, pseudoElement) {
		this.el = element;
		this.getPropertyValue = function(prop) {
			var re = /(\-([a-z]){1})/g;
			if(prop == 'float')
				prop = 'styleFloat';
			if(re.test(prop)) {
				prop = prop.replace(re, function() {
					return arguments[2].toUpperCase();
				});
			}
			return this.el.currentStyle[prop] ? this.el.currentStyle[prop] : null;
		}
		return this;
	}
};

window.clientArea = function() {
	var e = window, a = 'inner';
	if(!('innerWidth' in window))
	{
		a = 'client';
		e = document.documentElement || document.body;
	}
	
	return {
		width : e[ a + 'Width' ],
		height : e[a + 'Height']
	}
}