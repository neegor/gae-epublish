var ePub = new function () {

  var parser = new DOMParser();

  this.open = function (uri, callback) {
    var client = new XMLHttpRequest();

    client.onreadystatechange = function () {
      if (client.readyState == 4 && client.status == 200) {
        var archive = new Zip.Archive(client.responseText);
        callback(new ePub.Book(archive));
      } else if (client.readyState == 4 && client.status < 400 && client.status > 299) {
        alert('I need to look elsewhere for the book, but I don\'t know how!');
      } else if (client.readyState == 4) {
        alert('There was an error reading the book! I need CORS support to read books from other domains! (result code was ' + client.readyState + '/' + client.status);
      }
    };
    client.overrideMimeType('text/plain; charset=x-user-defined');
    client.open("GET", uri);
    client.send(null);
  };

  this.Book = function (archive) {
	var archiveRoot = "";
	if (!archive.files['META-INF/container.xml']) {
		for (var i in archive.files) {
			archiveRoot = i;
			break;
		}
	}

    var ocf = new ePub.OCF(archive.files[archiveRoot + 'META-INF/container.xml'].content());

var opf = null;
if (!ocf.rootFile) {
	for (var i in ocf.alternateFormats) {
		opf = new ePub.OPF(archiveRoot + ocf.alternateFormats[i], archive);
		break;
	}
} else {
	opf = new ePub.OPF(archiveRoot + ocf.rootFile, archive);
}

    this.getFile = opf.getFileByName;

    this.title = opf.title;
    this.author = opf.creator;

    this.contents = opf.contents;
    this.contentsByFile = opf.contentsByFile;

    this.toc = opf.toc.contents;
  };

  this.OCF = function (containerXML) {
    var container = parser.parseFromString(containerXML, "application/xml");

    var rootfiles = container.querySelectorAll("rootfile"),
        formats = {};

    // This ignores the presence of multiple alternate formats of the same type.
    var l = rootfiles.length;
    while (l--) {
      formats[rootfiles[l].getAttribute('media-type')] = rootfiles[l].getAttribute('full-path');
    }

    this.alternateFormats = formats;

    // Since the elements were processed in reverse, this is the first one.
    this.rootFile = formats['application/oebps-package+xml'];
  };

  this.OPF = function (rootFile, archive) {

    var opfXML = archive.files[rootFile].content();
    var opf = parser.parseFromString(opfXML, "application/xml");

    var opfPath = rootFile.substr(0, rootFile.lastIndexOf('/'));

    // Get the spine and manifest to make things easier.
    var spine = opf.querySelector('spine');
    var manifest = opf.querySelector('manifest');

    this.getFileByName = function (fileName) {
      if ((n = fileName.indexOf('#')) >= 0) fileName = fileName.substr(0, n);
      var fullPath = [opfPath, fileName].join("/");

      return archive.files[fullPath];
    };

    this.getFileById = function (id) {
      var fileName = manifest.querySelector("[id='" + id + "']").getAttribute('href');
      return this.getFileByName(fileName);
    }

    // Build the contents file. Needs some work.
    var itemrefs = spine.querySelectorAll('itemref');
    var il = itemrefs.length;
    var contents = [];
    var contentsByFile = {};
    while (il--) {
      var id = itemrefs[il].getAttribute('idref');
      var file = this.getFileById(id);
      contents.unshift(file);
      contentsByFile[file.name] = file;
    }

    this.contents = contents;
    this.contentsByFile = contentsByFile;

    // Basic metadata. Needs some work.
    this.title  = opf.querySelector('title').textContent;
    this.creator = opf.querySelector('creator').textContent;

    // Fetch the table of contents. This (i.e., the spec) is really confusing,
    // so it might be wrong. needs more investigation.
    var tocId = spine.getAttribute('toc');
    this.toc = new ePub.NCX(tocId, this);
  };

  this.NCX = function (tocId, opf) {
    var ncxXML = opf.getFileById(tocId).content();
    var ncx = parser.parseFromString(ncxXML, 'application/xml');

    // navmap > navpoint > navlabel > text(), navmap > navpoint > content into an array
    var navpoints = ncx.querySelectorAll('navMap navPoint');
    var contents = [];

    for (var i = 0, l = navpoints.length; i < l; i++) {
      var src = navpoints[i].querySelector('content').getAttribute('src');
      var file = opf.getFileByName(src);
      var content;

      if (!file) {
        content = function () { return "" };
      } else {
        content = function () {
          //return decodeURIComponent( escape(file.content()) )
		return file.content();
        };
      }

      var point = {
        title:    navpoints[i].querySelector('navLabel text').textContent,
        fileName: file.name,
        content:  content
      }

      if (!file) {
//        console.log("Couldn't find a file named " + src + " for section named " + point.title);
      }

      var pos = navpoints[i].getAttribute('playOrder') - 1;
      contents[navpoints[i].getAttribute('playOrder')-1] = point;
    }

    this.contents = contents;
  };

}();