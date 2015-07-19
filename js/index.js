/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
location.hash = "";

// manage the password entries
var entryManager = {
    // load entries
    "init" : function () {
        this.load();
        this.feistel = new Feistel("", null, 10);
    },

    // creates a new "entry" object
    "create" : function (title, desc, secret) {
        var entry = {"title" : title, "description" : desc};
        if (typeof secret == "string") {
            entry.encrypted = true;
            entry.secret = secret;
        } else {
            entry.encrypted = false;
            entry.secret = secret;
        }
        return entry;
    },

    // creates a new "entry" object and adds it to the list
    "new" : function (title, desc, secret, pass) {
        this.entries.push(this.create(title, desc, secret));
        this.hashes.push(this.hash(pass));
        this.index = this.entries.length-1;
        if (this.config.enNew) {
            this.encrypt();
        }
        this.save();
    },

    // finds the entry at the specified index and returns an object
    "get" : function (index) {
        if (typeof index == "undefined") {
            index = this.index;
        }
        if (index >= 0) {
            return this.entries[index];
        }
        return null;
    },

    // edits the current entry
    "edit" : function (title, desc, secret, pass) {
        var entry = this.get();
        if (entry != null) {
            entry.title = title;
            entry.description = desc;
            if (!entry.encrypted) {
                entry.secret = secret;
                if (pass != null) { // update password if needed
                    this.hashes[this.index] = this.hash(pass);
                }
                if (this.config.enEdit) {
                    this.encrypt();
                }
            }
            this.save();
        } else {
            alert ("Error: Could not edit entry because no entry is selected");
        }
    },

    "remove" : function (index) {
        if (typeof index == "undefined") {
            index = this.index;
        }
        var entry = this.get(index);
        if (entry == null)
            return false;

        this.entries.splice(index, 1);
        this.hashes.splice(index, 1);

        // adjust current entry to account for changes in entry list
        if (index <= this.index) {
            this.index--;
            if (this.index < 0)
                this.index = 0;
        }
        this.save();
    },

    "feistel" : null,

    // encrypt secret section of current entry
    "encrypt" : function (index, save) {
        // use password's hash to encrypt
        // do not use the password directly!
        // direct use would mean we're saving unencrypted passwords somewhere
        if (typeof index == "undefined") {
            index = this.index;
        }
        var entry = this.get(index);
        if (entry == null) {
            alert("encrypt failed: entry not found");
            return false;
        }

        if (!entry.encrypted) {
            if (this.hashes[index] == 0) {
                var e = "Unable to Encrypt: null hash\n"
                        +"(This shouldn't happen, but try Setting a new "
                        +"Password for this entry to fix this error)";
                alert(e);
                throw Error(e);
            }
            this.feistel.key = this.hashes[index];
            entry.secret = str2hex(this.feistel.encrypt(
                        JSON.stringify(entry.secret)));
            entry.encrypted = true;
            if (save == null || save == false)
                this.hashes[index] = this.hash();
            this.feistel.key = "";
            return true;
        }
        alert("encrypt failed: entry " + index + " already encrypted");
        return false;
    },

    // decrypt secret section of current entry
    "decrypt" : function (pass, index, save) {
        if (typeof index == "undefined") {
            index = this.index;
        }
        var entry = this.get(index);
        if (entry == null)
            return false;

        if (entry.encrypted) {
            if (save != true) {
                this.hashes[index] = this.hash(pass);
            }
           
            this.feistel.key = this.hashes[index];
            var s = this.feistel.decrypt(hex2str(entry.secret));
            if (s[0] == "{") {
                entry.secret = JSON.parse(s);
                entry.encrypted = false;
                this.feistel.key = "";
                return true;
            } else {
                this.hashes[index] = this.hash();
            }
        } else {
            alert("invalid entry");
        }
        return false;
    },

    // save entries as JSON strings
    "save" : function () {
        if (typeof window.localStorage != "undefined") {
            // first encrypt everything
            for (var i=0;i<this.entries.length;i++) {
                if (!this.entries[i].encrypted ) {
                    this.encrypt(i, true);
                }
            }
            
            // save to local storage
            window.localStorage.setItem('entries',JSON.stringify(this.entries));
            window.localStorage.setItem('config', JSON.stringify(this.config));

            // decrypt everything that wasn't encrypted before save
            for (var i=0;i<this.hashes.length;i++)
                if (this.hashes[i] != 0)
                    this.decrypt(null, i, true);
        }
    },

    // load entries from JSON strings
    "load" : function () {
		try {
        	if (typeof window.localStorage != "undefined"
            && typeof JSON != "undefined") {
    	        var state = JSON.parse(window.localStorage.getItem('entries'));
	            if (state != null) {
                	this.entries = state;
                    this.hashes = [];
            	    for (var i=0;i<this.entries.length;i++) {
        	            this.hashes.push(0);
    	            }
	            }

            	var config = JSON.parse(window.localStorage.getItem('config'));
        	    if (config != null)
    	            this.config = config;
        	} else {
				alert("Error: localStorage not found");
			}
		} catch (e) {
			alert("Error: load function crashed");
		}
    },

    // save entries to file
    "toFile" : function () {
        // first encrypt everything
        for (var i=0;i<this.entries.length;i++)
            if (!this.entries[i].encrypted)
                this.encrypt(i, true);
            
        var save = JSON.stringify({
            "entries" : this.entries,
            "config" : this.config
        });
        var fileName = "feistypass";
        var dirName = "Feisty";
        if (window.requestFileSystem && LocalFileSystem) {
            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFS, fail);
            function gotFS(fileSystem) {
                var sdcard = fileSystem.root;
                sdcard.getDirectory(dirName, {create: true}, function (dir) {
                    dir.getFile(fileName+".txt", {create: true, exclusive: false},
                    function (fileEntry) {
                        fileEntry.createWriter(function (writer) {
                            writer.write(save);
                            fadeMessage("Saved to " + dirName + "/" + fileName + ".txt");
                        }, fail);
                    }, fail);
                }, fail);
            }
            function fail(error) {
                fadeMessage("Error While Saving:<br /> " +error.code);
            }
        } else {
            var blob = new Blob([save], {type:'text/plain'});
            var downloadLink = document.createElement("a"); 
            downloadLink.download = fileName
                + (new Date()).toJSON().substr(0, 10) + ".txt";
            downloadLink.innerHTML = "<br />save as text file";
            downloadLink.href = window.URL.createObjectURL(blob);
            downloadLink.onclick = function (event) {
                document.body.removeChild(event.target);};
            downloadLink.style.display = "none";
            document.body.appendChild(downloadLink);
            downloadLink.click();
        }

        // decrypt everything that wasn't encrypted before save
        for (var i=0;i<this.hashes.length;i++)
            if (this.hashes[i])
                this.decrypt(null, i, true);
    },

    // load entries from file
    "fromFile" : function () {
        function replaceData(evt) {
            var state = JSON.parse(evt.target.result);
            if (state.config != null) {
    	        entryManager.config = state.config;
	        }
	        if (state.entries != null) {
            	entryManager.entries = state.entries;
                entryManager.hashes = [];
                for (var i=0;i<entryManager.entries.length;i++) {
                    entryManager.hashes.push(entryManager.hash());
    	        }
                entryManager.index = 0;
                entryManager.save();
                fadeMessage("Data Loaded Successfully");
                $.mobile.changePage("#indexPage");
	        }
        }
        if (window.requestFileSystem && LocalFileSystem) {
            var fileName = "feistypass";
            var dirName = "Feisty";
            window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, gotFS, fail);
            function gotFS(fileSystem) {
                var sdcard = fileSystem.root;
                sdcard.getDirectory(dirName, {create: true}, function (dir) {
                    dir.getFile(fileName+".txt", {create: true, exclusive: false},
                    function (fileEntry) {
                        fileEntry.file(function (file) {
                            var reader = new FileReader();
                            reader.onloadend = replaceData;
                            reader.readAsText(file);
                        }, fail);
                    }, fail);
                }, fail);
            }
            function fail(error) {
                fadeMessage("Error While Saving:<br /> " +error.code);
            }
        } else {
            var file = document.createElement("input");
            file.type="file";
            file.style.display = "none";
            file.addEventListener("change", function () {
                var fileToLoad = this.files[0];
                var fileReader = new FileReader();
                fileReader.onload = replaceData;
                fileReader.readAsText(fileToLoad, "UTF-8");

                this.parentNode.removeChild(this);
            }, false);
            document.body.appendChild(file);
            file.click();
        }
    },

    "index" : -1,
    "entries" : [],
    "hashes" : [],
    "hash" : function (pass) {
        if (typeof pass == "string")
            return SHA512(this.config.salt+pass);
        else
            return 0;
    },
    "config" : {
        "salt" : "thinkOfABetterSalt",
        "enNew" : true,
        "enEdit" : false,
        "randPasses" : false,
        "version" : 1.0,
    },
    // generate a random 10 character password string
    // I have no idea what I'm doing
    "random" : function () {
        var length = 10;
        var lower = "abcdefghijkmnopqrstuvwxyz";
        var upper = "ABCDEFGHJKLMNPQRSTUVWXYZ";
        var numbers = "123456789";
        var symbols = "-_";
        // zero, O, l and I dropped from list because
        // they can be mistaken for other character

        var set = ""; // we may want to make this variable at some point
        set += lower + upper + numbers + symbols;

        var pass = [];
        for (var i=0;i<length-3;i++) {
            pass.push(set.charAt(Math.floor(Math.random()*set.length)));
        }
        pass.splice(Math.floor(Math.random()*(length-3)), 0,
            lower.charAt(Math.floor(Math.random()*lower.length)));
        pass.splice(Math.floor(Math.random()*(length-2)), 0,
            upper.charAt(Math.floor(Math.random()*upper.length)));
        pass.splice(Math.floor(Math.random()*(length-1)), 0,
            numbers.charAt(Math.floor(Math.random()*lower.numbers)));

        return pass.join("");
    },
}

function fadeMessage (str) {
    $("<div class='ui-loader ui-overlay-shadow ui-body-a ui-corner-all'> " + str + "</div>")
        .css({ "display": "block", "opacity": 0.96, "width":"50%", "top": "40%", "left" : "25%", "padding":"0 5px", "text-align":"center"})
        .appendTo( $.mobile.pageContainer )
        .delay( 1500 )
        .fadeOut( 400, function(){
            $(this).remove();
        });
}

function hex2str (hex) {
    var str = "";
    for (var i=0;i<hex.length;i+=2) {
        str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
}

function str2hex (str) {
    var ch = ["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F"];
    var hex = "";
    for (var i=0;i<str.length;i++) {
        var num = str.charCodeAt(i);
        hex += ch[Math.floor(num / 16)] + ch[num % 16];
    }
    return hex;
}

function displayList () {
    var list = $('#current');
    list.html("");
    var rows = entryManager["entries"];
    for (var i=0;i<rows.length;i++) {
        var a = $('<a href="#entryPage">' + rows[i].title + '</a>');
        a[0].index = i;
        var li = $('<li></li>').append(a.click(function () {
            displayEntry(this.index);
        }));
        list.append(li).listview('refresh');
    }
}

function toggleSort() {
    if ($("#sortable").is(":checked")) {
        $("#current").sortable( "option", "disabled", false );
    } else {
        $("#current").sortable( "option", "disabled", true );
    }
    $("#sortable").checkboxradio("refresh");
}

function displayEntry (index) {
    var entry;
    if (index >= 0) {
        entryManager.index = index;
    }
    var entry = entryManager.get();
    $("#dtitle").html(entry.title);
    $("#ddesc").html(parse(entry.description));
    $("#ddesc input").textinput();
    $("#ddesc .password_showhide_button").button();
    $("#ddesc .ui-input-btn").click(passwordShowHide);
    if (entry.encrypted) {
        $("#dencrypt").html("Encrypted");
        $("#dcont").html(entry.secret);
        $("#dec_btn").show();
        $("#enc_btn").hide();
    } else {
        $("#dencrypt").html("Decrypted");
        $("#dcont").html(parse(entry.secret.content));
        $("#dcont input").textinput();
        $("#dcont .password_showhide_button").button();
        $("#dcont .ui-input-btn").click(passwordShowHide);
        $("#dec_btn").hide();
        $("#enc_btn").show();
    }
}

function parse(str) {
    str = str.replace(/\n/g,"<br />");
    var pass = /\[[^\]]*]/g;
    var pass_html = [
        "<table><tr>\n"
       +"    <td>\n"
       +"        <input data-theme=\"a\" type=\"password\" value=\"",

        "\" data-inline=\"true\" READONLY/>\n"
       +"    </td><td>\n"
       +"        <a href=\"#\" class=\"password_showhide_button\""
                 +" data-role=\"button\" data-icon=\"eye\" data-iconpos=\"notext\" data-inline=\"true\">Show</a>\n"
       +"    </td>\n"
       +"</tr></table>\n"
    ];
    var spaces = str.split(pass);
    var matches = str.match(pass);
    var parsed = [];
    if (matches == null)
        return str;

    if (str.indexOf(pass) == 0) {
        spaces.unshift("");
    }
    for (var i=0;i<matches.length;i++) {
        parsed.push(spaces[i]);
        var txt = matches[i];
        txt = txt.substr(1, txt.length-2).replace(/\\/g,"\\\\").replace(/"/,"\\\"");
        parsed.push(pass_html[0]+txt+pass_html[1]);
    }
    if (spaces.length > matches.length) {
        parsed.push(spaces[spaces.length-1]);
    } 
    return parsed.join("");
}

function passwordShowHide() {
    var pass = $(this).parent().prev().find('input');
    pass.attr('type', pass.attr('type')=='password'?'text':'password');
}

function passwordShowHideSample() {
    $('#pw_sample_out')
        .html(parse($('#pw_sample_in').val()));
    $("#pw_sample_out .password_showhide_button").click(passwordShowHide);
}

function deleting () {
    entryManager.remove();
}

// setup triggered by pressing "new"
function setNew() {
    $("#etype").val("new");
    $("#etitle").val("");
    $("#edesc").val("");
    $("#epass1").val("");
    $("#epass2").val("");
    $("#epass1").css("border", "0px solid transparent");
    $("#epass2").css("border", "0px solid transparent");
    if (entryManager.config.randPasses) {
        $("#econt").val("[" + entryManager.random() + "]");
    } else {
        $("#econt").val("");
    }
    $("#eenc").show();
}

// setup triggered by pressing "edit"
function setEdit() {
    var entry = entryManager["get"]();
    $("#etype").val(entryManager["index"]);
    $("#etitle").val(entry.title);
    $("#edesc").val(entry.description);
    $("#epass1").val("");
    $("#epass2").val("");
    $("#epass1").css("border", "0px solid transparent");
    $("#epass2").css("border", "0px solid transparent");
    if (!entry.encrypted) {
        $("#eenc").show();
        $("#econt").val(entry.secret.content);
    } else {
        $("#eenc").hide();
        $("#econt").val(entry.secret);
    }
}

// saves when save button is pressed on the "New / Edit"
function saveEdit() {
    var type  = $("#etype").val()||"";
    var title = $("#etitle").val()||"";
    var desc  = $("#edesc").val()||"";
    var pass1 = $("#epass1").val()||"";
    var pass2 = $("#epass2").val()||"";
    var cont  = $("#econt").val()||"";

    if (pass1 != pass2) {
        $("#epass1").css("border", "1px solid #F00");
        $("#epass2").css("border", "1px solid #F00");
        fadeMessage("Passwords did not match");
    } else {
        $("#epass1").css("border", "0px solid transparent");
        $("#epass2").css("border", "0px solid transparent");
        if (type == "new") {
            entryManager["new"](title, desc, {content:cont}, pass1);
        } else {
            entryManager["index"] = parseInt(type, 10);
            entryManager["edit"](title, desc, {content:cont}, pass1==""?null:pass1);
        }
        $.mobile.changePage("#entryPage");
        displayEntry()
    }
}

function encrypt () {
    entryManager["encrypt"]();
    displayEntry();
}

function setDecrypt () {
    $('#depass').val('');
    $('#desalt').val(entryManager.config.salt);
}

function decrypt (pass, salt) {
    var s = entryManager.config.salt;
    entryManager.config.salt = salt;

    try {
        entryManager["decrypt"](pass);
    } catch (e) {
        console.log("something errored during encryption");
    }

    entryManager.config.salt = s;
    displayEntry();
}

function setOptions () {
    $("#salt").val(entryManager.config.salt);

    $("#encrypt_edit").attr('checked', entryManager.config.enEdit);
    $("#encrypt_new").attr('checked', entryManager.config.enNew);
    $("#random_passwords").attr('checked', entryManager.config.randPasses);

    $("#encrypt_edit").checkboxradio("refresh");
    $("#encrypt_new").checkboxradio("refresh");
    $("#random_passwords").checkboxradio("refresh");
}

function updateConfig() {
    entryManager.config.salt = $("#salt").val();
    entryManager.config.enNew = $("#encrypt_new").is(":checked");
    entryManager.config.enEdit = $("#encrypt_edit").is(":checked");
    entryManager.config.randPasses = $("#random_passwords").is(":checked");
    entryManager.save();
}

function saveToFile () {
    entryManager.toFile();
}

function loadFromFile () {
    entryManager.fromFile();
}

function randomSalt() {
    $("#salt").val(entryManager.random());
    entryManager.config.salt = $("#salt").val();
    entryManager.save();
}

function deleteAll() {
    entryManager["index"] = 0,
    entryManager["entries"] = [];
    entryManager["hashes"] = [];
    entryManager["save"]();
    fadeMessage("All Entries Deleted!");
}

$(document).on("pageshow", "#indexPage", function () {
    displayList();
    $("#sortable").attr('checked', false);
    $("#sortable").checkboxradio("refresh");
    $('#current').sortable( "option", "disabled", true );
});

$(document).on("pageinit", "#indexPage", function () {
    entryManager.init();

    // make list sortable by dragging
    $('#current')
        .sortable({
            containment: 'parent',
            opacity: 0.6,
            disabled: true,
            update: function(event, ui) {
                var a = $('#current a');
                var start = -1;
                var end = -1;
                var up = false;

                // find what element moved
                for (var i=0;i<a.length;i++) {
                    if (a[i].index != i && start == -1) {
                        start = i;
                        if (a[i].index != i+1) {
                            up = true;
                        }
                    }
                    if (a[i].index == i && start != -1 && end == -1) {
                        end = i-1;
                    }
                }
                if (end < start) {
                    end = a.length - 1;
                }
                if (start != -1 && end != -1) {
                    var e = entryManager.entries;
                    var h = entryManager.hashes;
                    if (up) {
                        e.splice(start, 0, e.splice(end, 1)[0]);
                        h.splice(start, 0, h.splice(end, 1)[0]);
                    } else {
                        e.splice(end, 0, e.splice(start, 1)[0]);
                        h.splice(end, 0, h.splice(start, 1)[0]);
                    }
                    displayList();
                    entryManager.save();
                }
            }
        });

    // scroll the help list to display the content of the expanded entry
    $('.help-list').bind('collapsibleexpand', function (event, ui) {
        $('.help-list li').each(function (index) {
            var li = $(this);
            if (li.is("li") && li.is(".ui-collapsible") && li.is(":not(.ui-collapsible-collapsed)")) {
                if (index > 1) {
                    li.prev().prev()[0].scrollIntoView();
                }
                if (index == 1) {
                    li.parent().prev()[0].scrollIntoView();
                }
            }
        })
    });

    passwordShowHideSample();
    if (entryManager.entries.length == 0) {
        randomSalt();
        entryManager.new(
            "Welcome To Feisty Pass!",
            "This is an introductory entry to help explain some of the apps workings.\n\n"+
            "Before you do anything more, it is recommended that you change the salt. "+
            "you can do this by pressing the \"Options\" button at the top right. "+
            "For more information, see the help page.\n\n"+
            "This entry's salt is [" + entryManager.config.salt + "] and it's password is [password]",
            {content:"You've successfully decrypted this introduction!"},
            "password");
    }
    displayList();
});

$(document).on("pageshow", "#optionsPage", function () {
    setOptions();
});

$(document).on('pagebeforeshow', '#entryPage', function(){ 
    $("#popupDecrypt").popup({
        afteropen: function( event, ui ) {
            $('#depass').focus();
        }
    });
});
