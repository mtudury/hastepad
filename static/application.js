/* global $, window, document */

///// represents a single document

var haste_document = function() {
  this.locked = false;
};

// Escapes HTML tag characters
haste_document.prototype.htmlEscape = function(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/>/g, '&gt;')
    .replace(/</g, '&lt;')
    .replace(/"/g, '&quot;');
};

// Get this document from the server and lock it here
haste_document.prototype.load = function(key, callback, lang) {
  var _this = this;
  $.ajax('/documents/' + key, {
    type: 'get',
    dataType: 'json',
    success: function(res) {
      _this.locked = true;
      _this.key = key;
      _this.data = res.data;
      callback({
        value: res.data,
        key: key
      });
    },
    error: function() {
      callback(false);
    }
  });
};

// Save this document to the server and lock it here
haste_document.prototype.save = function(key, data, callback) {
  if (this.locked) {
    return false;
  }
  this.data = data;
  var _this = this;
  $('.logo').addClass('logo_save');
  window.setTimeout(function() { $('.logo').removeClass('logo_save'); }, 300);
  $.ajax('/documents/' + key, {
    type: 'post',
    data: data,
    dataType: 'json',
    contentType: 'text/plain; charset=utf-8',
    success: function(res, statustxt, xhr) {
      _this.key = res.key;
      callback(null, {
        value: res.data,
        key: res.key,
        statusCode: xhr.status
      });
    },
    error: function(res) {
      try {
        callback($.parseJSON(res.responseText));
      }
      catch (e) {
        callback({message: 'Something went wrong!'});
      }
    }
  });
};

// Save this document to the server and lock it here
haste_document.prototype.deleteDocument = function(key, callback) {
  if (!this.locked) {
    return false;
  }
  var _this = this;
  $.ajax('/documents/' + key, {
    type: 'delete',
    success: function(res) {
      callback(null, res);
    },
    error: function(res) {
      try {
        callback($.parseJSON(res.responseText));
      }
      catch (e) {
        callback({message: 'Something went wrong!'});
      }
    }
  });
};

// get a valid key from server
haste_document.prototype.getkey = function(callback) {
  $.ajax('/key/', {
    type: 'get',
    success: function(res) {
      callback(null, res);
    },
    error: function(res) {
      try {
        callback($.parseJSON(res.responseText));
      }
      catch (e) {
        callback({message: 'Something went wrong!'});
      }
    }
  });
};

///// represents the paste application

var haste = function(appName, options) {
  this.appName = appName;
  this.$textarea = $('textarea');
  this.options = options;
  this.configureShortcuts();
  this.configureButtons();
  this.showKeys = true;
  // If twitter is disabled, hide the button
  if (!options.twitter) {
    $('#box2 .twitter').hide();
  }
  _this = this;
  $('.logo').click(function (e) {
    e.preventDefault();
    if (_this.showKeys) {
      _this.showKeys = false;
      $('#key').css('height', '40px');
      _this.updateKeySize();
    } else {
      _this.showKeys = true;
      $('#key').css('height', 'auto');
      _this.updateKeySize();
    }
  });
};

// Set the page title - include the appName
haste.prototype.setTitle = function(ext) {
  var title = ext ? this.appName + ' - ' + ext : this.appName;
  document.title = title;
};

haste.prototype.updateKeySize = function () {
  if (this.showKeys) {
    $("#container").css("right", $("#key").outerWidth());
  } else {
    $("#container").css("right", '0');
  }
};

// Show a message box
haste.prototype.showMessage = function(msg, cls) {
  var msgBox = $('<li class="'+(cls || 'info')+'">'+msg+'</li>');
  $('#messages').prepend(msgBox);
  setTimeout(function() {
    msgBox.slideUp('fast', function() { $(this).remove(); });
  }, 3000);
};

// Show the light key
haste.prototype.lightKey = function() {
  this.configureKey(['new', 'save']);
};

// Show the full key
haste.prototype.fullKey = function() {
  var keys = ['new', 'duplicate', 'edit', 'raw'];
  if (config.allowDelete) {
    keys.push('delete');
  }
  this.configureKey(keys);
};

// Show all the keys
haste.prototype.allKey = function() {
  var keys = ['new', 'save', 'duplicate', 'edit', 'raw'];
  if (config.allowDelete) {
    keys.push('delete');
  }
  this.configureKey(keys);
};

haste.prototype.setReadOnly = function (ro) {
  this.editor.EditorOptions.readOnly = ro;
};

haste.prototype.showEditor = function(key) {
  _this = this;
  if (!this.editor) {
    this.editor = monaco.editor.create(document.getElementById('container'), {
      model: monaco.editor.createModel(_this.doc?_this.doc.data:'', undefined, monaco.Uri.file(key)),
    
      lineNumbers: 'on',
      roundedSelection: false,
      scrollBeyondLastLine: false,
      readOnly: _this.doc.locked,
      theme: 'vs-dark'
    });
    this.editor.onDidChangeModelContent(function (e) {
      if (_this.doc) {
        if (_this.editor.getValue().replace(/^\s+|\s+$/g, '') !== '')
          _this.doc.changed = true;
      }
    });
    this.updateKeySize();
  }

  if (m = /.+\.([^.]+)$/.exec(key)) {
    //mode = CodeMirror.findModeByExtension(m[1]);
    //CodeMirror.autoLoadMode(this.editor, mode.mode);
    //this.editor.setOption("mode", mode.mime);
  }
};

// Set the key up for certain things to be enabled
haste.prototype.configureKey = function(enable) {
  var $this, i = 0;
  $('#box2 .function').each(function() {
    $this = $(this);
    for (i = 0; i < enable.length; i++) {
      if ($this.hasClass(enable[i])) {
        $this.addClass('enabled');
        return true;
      }
    }
    $this.removeClass('enabled');
  });
};

haste.prototype.getCurrentKey = function () {
  var key = window.location.pathname;
  if (key == "/")
    key = null;
  else
    key = key.substr(1);

  return key;
}


// Get this document from the server and lock it here
haste.prototype.getList = function(callback) {
  var _this = this;
  if (!config.allowList)
    return;
  $.ajax('/documents/', {
    type: 'get',
    dataType: 'json',
    success: function(res) {
      callback(res);
    },
    error: function() {
      callback(false);
    }
  });
};

// Remove the current document (if there is one)
// and set up for a new one
haste.prototype.newDocument = function(forcenewkey, callback) {
  var _this = this;

  var key = this.getCurrentKey();
  var newdoc = function(key) {
    window.history.pushState(null, _this.appName, '/'+key);
    _this.doc = new haste_document();
    _this.setTitle();
    _this.lightKey();
    _this.showEditor(key);
    // _this.editor.setOption("cursorBlinkRate", 530);
    _this.editor.focus();
    if (callback) {
      callback(_this.doc);
    }
  }
  if (key&&!forcenewkey) {
    newdoc(key);
  } else {
    haste_document.prototype.getkey(function (err, key) {
      newdoc(key);
    });
  }
  _this.updateList();
};

// Load a document and show it
haste.prototype.loadDocument = function(key) {
  var _this = this;
  _this.doc = new haste_document();
  _this.doc.load(key, function(ret) {
    if (ret) {
      _this.showEditor(key);
      _this.editor.setValue(ret.value);
      _this.setTitle(ret.key);
      _this.fullKey();
      _this.setReadOnly(true);
    }
    else {
      _this.newDocument();
    }
  });
  this.updateList();
};

// Duplicate the current document - only if locked
haste.prototype.duplicateDocument = function() {
  var _this = this;
  if (_this.doc.locked) {
    var currentData = _this.doc.data;
    _this.newDocument(true, function () {
      _this.editor.setValue(currentData);
    });
  }
};

// Lock the current document
haste.prototype.lockDocument = function() {
  var _this = this;
  this.doc.save(this.getCurrentKey(), this.editor.getValue(), function(err, ret) {
    if (err) {
      _this.showMessage(err.message, 'error');
    }
    else if (ret) {
      _this.doc.locked = true;
      _this.setReadOnly(true);
      _this.fullKey();
      if (ret.statusCode == 201)
        _this.updateList();
    }
  });
};

// UnLock the current document
haste.prototype.unlockDocument = function() {
  var _this = this;
  //todo set code mirror writable
  _this.doc.locked = false;
  _this.setReadOnly(false);
  _this.editor.focus();
  _this.lightKey();
};

haste.prototype.configureButtons = function() {
  var _this = this;
  this.buttons = [
    {
      $where: $('#box2 .save'),
      label: 'Save',
      shortcutDescription: 'control + s',
      shortcut: function(evt) {
        return evt.ctrlKey && (evt.keyCode === 83);
      },
      action: function() {
        if (_this.editor.getValue().replace(/^\s+|\s+$/g, '') !== '') {
          _this.lockDocument();
        }
      }
    },
    {
      $where: $('#box2 .new'),
      label: 'New',
      shortcut: function(evt) {
        return evt.ctrlKey && evt.keyCode === 78;
      },
      shortcutDescription: 'control + n',
      action: function() {
        _this.newDocument(true);
      }
    },
    {
      $where: $('#box2 .duplicate'),
      label: 'Duplicate & Edit',
      shortcut: function(evt) {
        return _this.doc.locked && evt.ctrlKey && evt.keyCode === 68;
      },
      shortcutDescription: 'control + d',
      action: function() {
        _this.duplicateDocument();
      }
    },
    {
      $where: $('#box2 .raw'),
      label: 'Just Text',
      shortcut: function(evt) {
        return evt.ctrlKey && evt.shiftKey && evt.keyCode === 82;
      },
      shortcutDescription: 'control + shift + r',
      action: function() {
        window.location.href = '/raw/' + _this.doc.key;
      }
    },
    {
      $where: $('#box2 .edit'),
      label: 'Edit',
      shortcut: function(evt) {
        return _this.doc.locked && evt.shiftKey && evt.ctrlKey && evt.keyCode == 84;
      },
      shortcutDescription: 'control + shift + t',
      action: function() {
        _this.unlockDocument();
      }
    },
    {
      $where: $('#box2 .delete'),
      label: 'Delete',
      shortcut: function(evt) {
        return false;
      },
      shortcutDescription: 'none',
      action: function() {
        _this.doc.deleteDocument(_this.getCurrentKey(), function () { 
          _this.editor.setValue('');
          _this.showMessage("Deleted");
          _this.updateList();
        });
      },
      shown: function() {
        return config.allowDelete;
      }
    }
  ];
  for (var i = 0; i < this.buttons.length; i++) {
    this.configureButton(this.buttons[i]);
  }
};

haste.prototype.configureButton = function(options) {
  if (options.shown && !options.shown()) {
    options.$where.hide();
  }
  // Handle the click action
  options.$where.click(function(evt) {
    evt.preventDefault();
    if (!options.clickDisabled && $(this).hasClass('enabled')) {
      options.action();
    }
  });
  // Show the label
  options.$where.mouseenter(function() {
    $('#box3 .label').text(options.label);
    $('#box3 .shortcut').text(options.shortcutDescription || '');
    $('#box3').show();
    $(this).append($('#pointer').remove().show());
  });
  // Hide the label
  options.$where.mouseleave(function() {
    $('#box3').hide();
    $('#pointer').hide();
  });
};

haste.prototype.updateList = function () {
  var _this = this;
  _this.getList(function (lst) {
    if (lst) {
      var lis = "";
      var cnt = 0;
      lst.forEach(function (file) {
        if (cnt < 150)
          lis+= '<li><a href="'+file+'">'+file+'</a></li>';
        cnt++;
      });
      $('#list').html(lis);
      _this.updateKeySize();
    }
  });
};

// Configure keyboard shortcuts for the textarea
haste.prototype.configureShortcuts = function() {
  var _this = this;
  $(document.body).keydown(function(evt) {
    var button;
    for (var i = 0 ; i < _this.buttons.length; i++) {
      button = _this.buttons[i];
      if (button.shortcut && button.shortcut(evt)) {
        evt.preventDefault();
        button.action();
        return;
      }
    }
  });
};

haste.prototype.autosave = function() {
  var _this = this;
  var cycle = function () {
    if ((_this.doc)&&(!_this.doc.locked)&&(_this.doc.changed)) {
      _this.doc.save(_this.getCurrentKey(), _this.editor.getValue(), function (err, data) {
        if (err) {
          _this.showMessage("Error "+err);
        } else {
          if (data.statusCode == 201)
            _this.updateList();
        }
      });
      _this.doc.changed = false;
    }
    window.setTimeout(cycle, 5000);  
  };

  window.setTimeout(cycle, 5000);
};

///// Tab behavior in the textarea - 2 spaces per tab
$(function() {

  $('textarea').keydown(function(evt) {
    if (evt.keyCode === 9) {
      evt.preventDefault();
      var myValue = '  ';
      // http://stackoverflow.com/questions/946534/insert-text-into-textarea-with-jquery
      // For browsers like Internet Explorer
      if (document.selection) {
        this.focus();
        var sel = document.selection.createRange();
        sel.text = myValue;
        this.focus();
      }
      // Mozilla and Webkit
      else if (this.selectionStart || this.selectionStart == '0') {
        var startPos = this.selectionStart;
        var endPos = this.selectionEnd;
        var scrollTop = this.scrollTop;
        this.value = this.value.substring(0, startPos) + myValue +
          this.value.substring(endPos,this.value.length);
        this.focus();
        this.selectionStart = startPos + myValue.length;
        this.selectionEnd = startPos + myValue.length;
        this.scrollTop = scrollTop;
      }
      else {
        this.value += myValue;
        this.focus();
      }
    }
  });

});
