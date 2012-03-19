if (!document.ELEMENT_NODE) {
	document.ELEMENT_NODE = 1;
	document.ATTRIBUTE_NODE = 2;
	document.TEXT_NODE = 3;
	document.CDATA_SECTION_NODE = 4;
	document.ENTITY_NODE = 6;
	document.PROCESSING_INSTRUCTION_NODE = 7;
	document.COMMENT_NODE = 8;
	document.DOCUMENT_NODE = 9;
	document.DOCUMENT_TYPE_NODE = 10;
	document.DOCUMENT_FRAGMENT_NODE = 11;
	document.NOTATION_NODE = 12;
}

document._importNode = function(node, allChildren) {
	switch (node.nodeType) {
		case document.ELEMENT_NODE:
			var newNode = document.createElement(node.nodeName);
			if (node.attributes && node.attributes.length > 0) {
				var il = node.attributes.length;
				for (var i = 0; i < il;) {
					var attr = node.attributes[i].nodeName.toLowerCase();
					 if(attr != 'src' && attr != 'xlink:href')
					
					/*if(node.attributes[i].nodeName.toLowerCase() != 'src')*/
						newNode.setAttribute(node.attributes[i].nodeName, node.getAttribute(node.attributes[i].nodeName));
					i++;
				}
			}
			if (allChildren && node.childNodes && node.childNodes.length > 0) {
				var il = node.childNodes.length;
				for (var i = 0; i < il;)
						newNode.appendChild(document._importNode(node.childNodes[i++], allChildren));
			}
			return newNode;
		break;
		case document.TEXT_NODE:
		case document.CDATA_SECTION_NODE:
		case document.COMMENT_NODE:
			return document.createTextNode(node.nodeValue);
      break;
  }
};

var Paginator = function (fromNode, toNode, styleContent) {
  var filteredTags = ['img', 'image'];
  var delay = 0;
  var callbacks = {};
  this.addCallback = function (cbk, cbkFunc) {
    if (callbacks[cbk]) {
      callbacks[cbk].push(cbkFunc);
    } else {
      callbacks[cbk] = [cbkFunc];
    }
  };

  var emitCallback = function (cbk, arg) {
    var cbks = callbacks[cbk];

    if (!cbks) return;

    for (var i = 0, l = cbks.length; i < l; i++) {
      cbks[i](arg);
    }

    if (cbk === 'page') {
      delay = 120;
    }
  }
 
  var realHeight = document.defaultView.
                   getComputedStyle(toNode, null).
                   getPropertyValue('height').
                   replace('px', '');
  var maxScrollHeight = toNode.offsetHeight - realHeight;

  var realScrollHeight = function () {
    return toNode.scrollHeight - maxScrollHeight;
  };

  var nodeHandler = new function() {
    var running = true,
        started = false,
        currentNode = toNode,
        nodeHierarchy = [];

    var shallowClone = function() {

      var method;
      if (fromNode.ownerDocument === toNode.ownerDocument) {
        return function (node) {
          return node.cloneNode(false);
        }
      } else {
        var targetDocument = toNode.ownerDocument;

        return function (node) {
          return targetDocument._importNode(node, false);
        }
      }

    }();

    var reset = function () {
      toNode.innerHTML = '';
      currentNode = toNode;

      for (var i = 0, l = nodeHierarchy.length; i < l; i++) {
        childNode = shallowClone(nodeHierarchy[i]);
        currentNode.appendChild(childNode);
        currentNode = childNode;
        currentNode.appendChild(document.createTextNode(""));
      }
    };

    this.start = function () {
      reset();
      emitCallback('start');
    }

    this.finish = function () {
      emitCallback('page', toNode.cloneNode(true));
      emitCallback('finish');
      reset();
    }
    
    this.startElement = function (element, c) {
      if (!started) {
        started = true;
        return c();
      }

      var newNode = shallowClone(element);
      if(newNode.nodeName.toLowerCase() === 'a')
      		newNode.setAttribute('href', '#');
      if(newNode.nodeName.toLowerCase() === 'img') {
      		newNode.setAttribute('src', '');
      		newNode.style.display = 'none';
      	}
      	
      currentNode.appendChild(newNode);
      
      if (realHeight < realScrollHeight()) {
        var imgs = toNode.getElementsByTagName('IMG');

        var origSizes = [],
            l = imgs.length,
            attempts = 0;

        for (var i = 0; i < l; i++) {
          origSizes[i] = [imgs[i].height, imgs[i].width];
        }

        while (attempts++ < 5 && realHeight < realScrollHeight()) {
          for (var i = 0; i < l; i++) {
            imgs[i].height = imgs[i].height * 0.9;
            imgs[i].width = imgs[i].width * 0.9;
          }
        }

        // If it didn't work, reset the image sizes.
        if (realHeight < realScrollHeight()) {
          for (var i = 0, l = origSizes.length; i < l; i++) {
            imgs[i].height = origSizes[i][0];
            imgs[i].width  = origSizes[i][1];
          }
        }
      }

      if (newNode.nodeName === 'IMG' && realHeight < realScrollHeight()) {
        currentNode.removeChild(newNode);

        emitCallback('page', toNode.cloneNode(true));
        reset();

        currentNode.appendChild(newNode);
      }

      currentNode = currentNode.lastChild;
      nodeHierarchy.push(currentNode);
      return c();
      //}
    }

    this.endElement = function (element, c) {
      currentNode = currentNode.parentNode;
      nodeHierarchy.pop();
      return c();
    }

    this.textNode = function (element, c) {
      var newTextNode = currentNode.ownerDocument.createTextNode(element.textContent);
      currentNode.appendChild(newTextNode);

      if (realHeight >= realScrollHeight()) {
        var tmpDelay = delay;
        delay = 0;
        setTimeout(function continueFast () {
        	c();
        }, tmpDelay);
        return;
      }
      
      currentNode.removeChild(newTextNode);
      
      if (!currentNode.lastChild || currentNode.lastChild.nodeType != 3) {
        currentNode.appendChild(currentNode.ownerDocument.createTextNode(""));
      }

      var textNode = currentNode.lastChild,
          space = '';

      var incomingText = element.textContent;

      var l = incomingText.length;

      var fitText = function (start, sliceLength) {

        if (start === l) {
          var tmpDelay = delay;
          delay = 0;

          setTimeout(function continueSlow () { c(); }, tmpDelay);
          return;
        }


        if (sliceLength <= 0) {
          emitCallback('page', toNode.cloneNode(true));

          incomingText = incomingText.substr(start, l - start);
          l = incomingText.length;

          reset();

          textNode = currentNode.lastChild;

          return fitText(start, l);
        }

        var testText = ((start == 0) ? '' : ' ') + incomingText.substr(start, sliceLength);

        textNode.textContent += testText;

        if (realHeight < realScrollHeight()) {
          textNode.textContent = textNode.textContent.substr(0, sliceLength + ((start == 0) ? 0 : 1));
          fitText(start, incomingText.lastIndexOf(' ', Math.floor(sliceLength / 2)));
        } else {
          fitText(sliceLength, incomingText.lastIndexOf(' ', Math.floor(sliceLength / 2)));
        }
      }

      var textChunks = element.textContent.split(/[\r\n ]/);
      

      var l = textChunks.length;
      while (l--) {
        var nextChunk = textChunks.shift();
        textNode.textContent += space + nextChunk;
        space = ' ';

        if (realHeight < realScrollHeight()) {
          textNode.textContent = textNode.textContent.substr(0, textNode.textContent.length - nextChunk.length);

          emitCallback('page', toNode.cloneNode(true));

          textChunks.unshift(nextChunk);
          l++;
          reset();

          textNode = currentNode.lastChild;
          space = '';
        }
      }

      var tmpDelay = delay;
      delay = 0;

      setTimeout(function continueSlow () { c(); }, tmpDelay);
    };
  };
  
  this.paginate = function () {
    new Sax.Parser(fromNode, nodeHandler).parse();
  };
};
