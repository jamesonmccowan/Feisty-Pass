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
        this.index = [this.entries.length-1];
        if (this.config.enNew)
            this.encrypt();
        if (this.config.saveNew)
            this.save();
    },

    // finds the entry at the specified index and returns an object
    // var ret = {
    //     index : the index of the entry
    //     entry : the entry itself
    //     hash : the stored hash of the entry (may be null)
    //     e_container : array that holds the entry
    //     h_container : array that holds the hash of the entry
    // }
    // return null on failure
    "get" : function (index) {
        index = index||this.index;
        if (index.length > 0) {
            var ret = this.getContainer(index);
            var last = index[index.length-1]

            try {
            ret.entry = ret.e_container[last];
            if (!ret.entry.encrypted) {
                ret.hash = ret.h_container[last];
                if (!ret.hash)
                    alert("null hash!" + JSON.stringify(index)
                            + ", " + JSON.stringify(ret.h_container));
            } else {
                ret.hash = null;
            }
            } catch (e) {
                alert ("error! " + last);
                throw e;
            }
            return ret;
        }
        return null;
    },

    "getContainer" : function (index) {
        if (!(index instanceof Array) && !(this.index instanceof Array)) {
            alert("target index not an Arry!");
            return null;
        }
        index = index||this.index;
        var e = this.entries;
        var h = this.hashes;
        var next = null;
        for (var i=0;i<index.length-1;i++) {
            next = e[index[i]];
            if (!next) {
                alert("container entry null");
                return null;
            }
            if (next.encrypted) {
                alert("container entry encrypted (" + i + ") ("
                        + JSON.stringify(index) + ")");
                return null;
            }
            if (!next.secret.entries)
                next.secret.entries = [];
            if (!h[index[i]].sub)
                h[index[i]].sub = [];
            e = next.secret.entries;
            h = h[index[i]].sub;
        }
        var ret = {
            index : index,
            e_container : e,
            h_container : h
        }
        return ret;
    },

    // takes an "entry" object and inserts it into the specified spot
    "insert" : function (index, entry, hash) {
        var e = this.getContainer(index);
        if (e == null)
            return false;

        var last = e.index[e.index.length-1];
        if (last < e.e_container.length) {
            e.e_container.splice(last, 0, entry);
            e.h_container.splice(last, 0, hash);
        } else {
            e.e_container.push(entry);
            e.h_container.push(hash);
        }
        
        // adjust current entry to account for changes in entry list
        if (e.index.length <= this.index.length) {
            // we only have to adjust if the inserted entry
            // was before/is the current entry
            for (var i=0;i<index.length-1;i++) {
                if (e.index[i] != this.index[i]) {
                    return true;
                }
            }
            if (e.index[e.index.length-1] <= this.index[e.index.length-1]) {
                this.index[e.index.length-1]++;
            }
        }
        return true;
    },

    // edits the current entry
    "edit" : function (title, desc, secret, pass) {
        var e = this.get();
        if (e != null) {
            var entry = e.entry;
            entry.title = title;
            entry.description = desc;
            if (!entry.encrypted) {
                entry.secret = secret;
                if (pass != null) {
                    e.h_container[e.index[e.index.length-1]] = this.hash(pass);
                }
            }
            if (this.config.enEdit)
                this.encrypt();
            if (this.config.saveEdit)
                this.save();
        } else {
            alert ("Error: Could not edit entry because no entry is selected");
        }
    },

    "remove" : function (index) {
        var e = this.get(index);
        if (e == null)
            return false;

        var last = e.index[e.index.length-1];
        e.e_container.splice(last, 1);
        e.h_container.splice(last, 1);

        // adjust current entry to account for changes in entry list
        if (e.index.length <= this.index.length) {
            // we only have to adjust if the removed entry
            // was before/is the current entry
            for (var i=0;i<e.index.length-1;i++) {
                if (e.index[i] != this.index[i]) {
                    return true;
                }
            }
            if (last == this.index[e.index.length-1]) {
                this.index = [];
            } else if (last < this.index[e.index.length-1]) {
                this.index[e.index.length-1]--;
            }
        }
        return true;
    },

    // delete entry
    "delete" : function (index) {
        // remove specifie
        this.remove(index);
        if (this.config.saveDelete)
            this.save();
    },

    "move" : function (from, to) {
        var index = this.index.slice(0);
        var flast = from[from.length-1];
        var tlast = to[to.length-1];

        // check if they're from the same container
        if (from.length == to.length) {
            var sameContainer = true
            for (var i=0;i<from.length-1;i++) {
                if (from[i] != to[i]) {
                    sameContainer = false;
                    break;
                }
            }
            if (sameContainer) {
                if (flast == tlast) {
                    return true;
                    // move was successful because
                    // object was moving to where it was already location
                }
            }
        }
        var e = this.get(from);
        var c = this.getContainer(to);
        if (e == null) {
            alert("error! Could not find entry to be moved");
            return false;
        }
        if (c == null) {
            alert("error! Could not find destination");
            return false;
        }
        if (c.e_container == null) {
            alert("error! Destination does not exist");
            alert("error! ");
            return false;
        }

        if (!this.remove(from)) {
            alert("error! couldn't remove entry to place it somewhere else");
            return false;
        }

        if (!this.insert(to, e.entry, e.hash)) {
            alert("error! entry was mistakenly deleted instead! Close Feisty Pass to prevent this change from being saved");
            return false;
        }
        if (this.config.saveMove)
            this.save();

        if (JSON.stringify(index) == JSON.stringify(from))
            this.index = to;

        return true;
    },

    "feistel" : null,

    // encrypt secret section of current entry
    "encrypt" : function (index, save) {
        // use password's hash to encrypt
        // do not use the password directly!
        // direct use would mean we're saving unencrypted passwords somewhere
        var e = this.get(index);
        if (e == null)
            return false;

        if (!e.entry.encrypted) {
            var last = e.index[e.index.length-1];
            if (e.entry.secret.entries && e.entry.secret.entries.length > 0) {
                var entries = e.entry.secret.entries;
                for (var i=0;i<entries.length;i++) {
                    this.encrypt(e.index.concat([i]), save);
                }
            }

            if (!e.hash) {
                throw Error("Unable to Encrypt: null hash\n"
                        +"(This shouldn't happen, but try Setting a new Password for this entry to fix this error)");
            }
            this.feistel.key = e.hash.hash;
            e.entry.secret = str2hex(this.feistel.encrypt(
                        JSON.stringify(e.entry.secret)));
            e.entry.encrypted = true;
            if (save == null || save == false)
                e.h_container[last] = null;
            this.feistel.key = "";
            return true;
        }
        return false;
    },

    // decrypt secret section of current entry
    "decrypt" : function (pass, index, save) {
        var e = this.get(index);
        if (e && e.entry && e.entry.encrypted) {
            var last = e.index[e.index.length-1];
            if (save != true)
                e.h_container[last] = this.hash(pass);
            
            if (e.h_container && e.h_container[last] && e.h_container[last].hash)
                this.feistel.key = e.h_container[last].hash;
            else
                alert("decryption failed for "+JSON.stringify(e.index));

            var s = this.feistel.decrypt(hex2str(e.entry.secret));
            if (s[0] == "{") {
                e.entry.secret = JSON.parse(s);
                e.entry.encrypted = false;
                if (e.entry.secret.entries) {
                    e.h_container[e.index[last]].sub = 
                        new Array(e.entry.secret.entries.length);
                }
                var entries = e.entry.secret.entries||[];
                // try to decrypt subentries with same password
                // commented out because it's too slow
                //for (var i=0;i<entries.length;i++) {
                //    this.decrypt(pass, e.index.concat([i]), save);
                //}
                this.feistel.key = "";
                return true;
            } else {
                e.h_container[last] = null;
                return false;
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
            for (var i=0;i<this.hashes.length;i++)
                if (this.hashes[i] != null)
                    this.encrypt([i], true);
            
            // save to local storage
            window.localStorage.setItem('entries', JSON.stringify(this.entries));
            window.localStorage.setItem('config', JSON.stringify(this.config));

            // decrypt everything that wasn't encrypted before save
            for (var i=0;i<this.hashes.length;i++)
                if (this.hashes[i] != null)
                    this.decrypt(null, [i], true);
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
        	            this.hashes.push(null);
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
        for (var i=0;i<this.hashes.length;i++)
            if (this.hashes[i] != null)
                this.encrypt(this.entries[i], i, true);
            
        // save to local storage
        var save = {
            "entries" : this.entries,
            "config" : this.config
        };
        var blob = new Blob([JSON.stringify(save)], {type:'text/plain'});
        var downloadLink = document.createElement("a"); 
        downloadLink.download = "feistypass"
            + (new Date()).toJSON().substr(0, 10) + ".txt";
        downloadLink.innerHTML = "<br />save as text file";
        downloadLink.href = window.URL.createObjectURL(blob);
        downloadLink.onclick = function (event) {
            document.body.removeChild(event.target);};
        downloadLink.style.display = "none";
        document.body.appendChild(downloadLink);
        downloadLink.click();

        // decrypt everything that wasn't encrypted before save
        for (var i=0;i<this.hashes.length;i++)
            if (this.hashes[i] != null)
                this.decrypt(null, this.entries[i], i, true);
    },

    // load entries from file
    "fromFile" : function () {
        var file = document.createElement("input");
        file.type="file";
        file.style.display = "none";
        file.addEventListener("change", function () {
            var fileToLoad = this.files[0];
            var fileReader = new FileReader();
            fileReader.onload = function(fileLoadedEvent) {
                var state = JSON.parse(fileLoadedEvent.target.result);
	            if (state.entries != null) {
                	entryManager.entries = state.entries;
                    entryManager.hashes = [];
            	    for (var i=0;i<entryManager.entries.length;i++) {
        	            entryManager.hashes.push(null);
    	            }
	            }

        	    if (state.config != null) {
    	            entryManager.config = state.config;
	            }
                list.build();
                if (entryManager.entries.length > 0) {
                    list.ul.getElementsByTagName("li")[0].select();
                }
            }
            fileReader.readAsText(fileToLoad, "UTF-8");

            this.parentNode.removeChild(this);
        }, false);
        document.body.appendChild(file);
        file.click();
    },

    "index" : [],
    "entries" : [],
    "hashes" : [],
    "hash" : function (pass) {
        if (typeof pass == "string")
            return {
                sub : [],
                hash : SHA512(this.config.salt+pass)};
        else
            return {
                sub : [],
                hash : SHA512(this.config.salt)};
    },
    "config" : {
        "salt" : "thinkOfABetterSalt",
        "saveEdit" : true,
        "saveNew" : true,
        "saveDelete" : true,
        "saveMove" : true,
        "enEdit" : true,
        "enNew" : true,
    }
}

// provide helpful display functions
var display = {
    "init" : function () {
        display.header = document.getElementById("header");
        display.body = document.getElementById("body");
    },
    "header" : null,
    "body" : null,
    "move" : null,

    // set the display's content by a header and body string
    "byStrings" : function (header, body) {
        this.move = null;
        if (header != null) {
            this.header.innerHTML = header;
        }
        if (body != null) {
            this.body.innerHTML = body;
        }
    },

    // set the display's content by a header string and an array of dom elements to append to the body
    "byElements" : function (header, list) {
        this.move = null;
        if (header != null) {
            this.header.innerHTML = header;
        }
        if (list != null) {
            this.body.innerHTML = "";
            for (var i=0;i<list.length;i++) {
                this.body.appendChild(list[i]);
            }
        }
    },

    // used in the add and edit forms to add another potential entry that reads into the 
    "addRow" : function (that, key, value) {
        if (that.index == null)
            that.index = 0;
        var tr = document.createElement("tr");
        var th = document.createElement("td");
        var td = document.createElement("td");
        var input = document.createElement("button");

        // move row button
        input.innerHTML = "O";
        input.setAttribute("class", "o");
        input.addEventListener("click", function () {
            if (display.move) {
                var tr = document.createElement("tr");
                var table = this.parentNode.parentNode.parentNode;
                var a = display.move;
                var b = this.parentNode.parentNode;
                display.move = null;

                table.insertBefore(tr, b);
                table.replaceChild(b, a);
                table.replaceChild(a, tr);
            } else {
                display.move = this.parentNode.parentNode;
            }
        }, false);
        th.appendChild(input);


        // key input box
        var input = document.createElement("input");
        input.setAttribute("id", "k" + that.index);
        input.setAttribute("value", (key==null?that.index:key));
        th.appendChild(input);
            
        // valuke input box
        var input = document.createElement("input");
        input.setAttribute("id", "v" + that.index);
        input.setAttribute("class", "v");
        input.setAttribute("value", (value==null?"":value));
        td.appendChild(input);

        // delete row button
        var input = document.createElement("button");
        input.innerHTML = "X";
        input.setAttribute("class", "x");
        input.addEventListener("click", function () {
            this.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode);
        }, false);
        td.appendChild(input);

        tr.appendChild(th);
        tr.appendChild(td);
        that.parentNode.parentNode.parentNode.appendChild(tr);
        that.index++;
    },

	// create form table for entries
    "formTable" : function (title, desc, encrypted) {
        var table = document.createElement("table");
        table.setAttribute("class", "form");

		// title input
        var tr = document.createElement("tr");
        var th = document.createElement("th");
        var td = document.createElement("td");
        th.innerHTML = "Title";
        td.innerHTML = '<input id="title" value="' + (title?title:'') + '" />';
        tr.appendChild(th);
        tr.appendChild(td);
        table.appendChild(tr);

		// description input
        tr = document.createElement("tr");
        th = document.createElement("th");
        td = document.createElement("td");
        th.innerHTML = "Description";
        td.innerHTML = '<textarea id="desc" value="">' + (desc?desc:"") + '</textarea>';
        tr.appendChild(th);
        tr.appendChild(td);
        table.appendChild(tr);

        tr = document.createElement("tr");
        td = document.createElement("td");
        if (encrypted) {
            td.colSpan = "2";
            td.innerHTML = '<p class="small">(Cannot change anything more on an encrypted entry)</p>';
            tr.appendChild(td);
            table.appendChild(tr);
            return table;
        } else {
            td.colSpan = "2";
            td.innerHTML = "This password will be used to encrypt this entry. This password will not be shown.";
            td.setAttribute("class", "small");
            tr.appendChild(td);
            table.appendChild(tr);
        }

		// change password input
        tr = document.createElement("tr");
        th = document.createElement("th");
        td = document.createElement("td");
        th.innerHTML = 'Password';
        td.innerHTML = '<input id="pass1" type="password" placeholder="password" />';
        tr.appendChild(th);
        tr.appendChild(td);
        table.appendChild(tr);

		// confirm change password input
        tr = document.createElement("tr");
        th = document.createElement("th");
        td = document.createElement("td");
        th.innerHTML = 'Confirm';
        td.innerHTML = '<input id="pass2" type="password" placeholder="password" />';
        tr.appendChild(th);
        tr.appendChild(td);
        table.appendChild(tr);

		// add rows button
        tr = document.createElement("tr");
        td = document.createElement("td");
        td.colSpan = "2";
        td.innerHTML = '<p class="small">The following section will be encrypted</p><button onclick="display.addRow(this)" id="count">More Rows</button>';
        tr.appendChild(td);
        table.appendChild(tr);

        return table;
    },

	// display an entry
    "entry" : function (e, index) {
        this.move = null;
		// entry encrypted status
        var encrypted = document.createElement("div");
        encrypted.innerHTML="<b>Status</b>: " + (e.encrypted?"Encrypted":"Decrypted");
        encrypted.setAttribute("class", "encrypted");

		// entry description
        var description = document.createElement("p");
        description.innerHTML = e.description;
        description.setAttribute("class", "description");

        var secret;
        if (!e.encrypted) {
			// display secret entries
            secret = document.createElement("table");
            for (var i in e.secret) {
                if (typeof e.secret[i] == "string" && i != "entries") {
                    var tr = document.createElement("tr");
                    var th = document.createElement("th");
                    var td = document.createElement("td");
                    th.innerHTML = i;
                    td.innerHTML = e.secret[i];
                    tr.appendChild(th);
                    tr.appendChild(td);
                    secret.appendChild(tr);
                }
            }
        } else {
			// display encrypted hex string
            secret = document.createElement("div");
            secret.innerHTML = e.secret;
        }
        secret.setAttribute("class", "secret");

        if (index) {
            entryManager.index = index;
        } else {
            entryManager.index = [];
        }

        this.byElements(e.title, [encrypted, description, secret]);
    },

	// display current entry
    "current" : function () {
        var e = entryManager.get();
        if (e) {
            this.entry(e.entry, e.index);
        } else {
            this.byStrings("Feisty Pass",
                document.getElementById("start_page").innerHTML);
        }

    }
}

// manage the page's list
var list = {
    "init" : function () {
        this.lbox = document.getElementById("lbox");
        this.up = document.getElementById("up");
        this.down = document.getElementById("down");
        this.in = document.getElementById("in");
        this.out = document.getElementById("out");

        // add drag events to list
        this.lbox.addEventListener("mousemove", function (e) {
            list.dragMove(e);
        }, false);
        this.lbox.addEventListener("mouseup", function (e) {
            list.dragEnd(e);
        }, false);
    },

    "lbox" : null,
    "ul" : null,
    "selected" : null,

    "build" : function () {
        function ul (entries, index) {
            var ul = document.createElement("ul");
            ul.lis = [];
            for (var i=0;i<entries.length;i++) {
                ul.appendChild(li(entries[i], index.concat([i])));
            }
            return ul;
        }
        function li (entry, index) {
            var li = document.createElement("li");
            li.innerHTML = entry.title;
            li.entry = entry;
            li.index = index;

            li.select = list.select;
            li.start = list.dragStart;
            li.addEventListener("mousedown", function (e) {
                this.start(e.clientX, e.clientY);
            }, false);
            li.build = function () {
                if (!this.entry.encrypted
                && this.entry.secret.entries
                && this.entry.secret.entries.length > 0) {
                    li.appendChild(ul(this.entry.secret.entries, this.index));
                }
            }
            li.build();
            return li;
        }

        this.ul = ul(entryManager.entries, []);
        var lis = this.ul.getElementsByTagName("li");

        // add list to page
        this.lbox.innerHTML = "";
        this.lbox.appendChild(this.ul);
        
        // select list item matching current entry
        if (entryManager.index.length > 0) {
            this.get().select();
        }
    },

    "get" : function (index) {
        index = index||entryManager.index;
        var lis = this.ul.children;
        var li = null;
        try {
            for (var i=0;i<index.length-1;i++) {
                li = lis[index[i]];
                lis = li.getElementsByTagName("ul")[0].children;
            }
            return lis[index[index.length-1]];
        } catch (e) {
        }
        return null;
    },

    // select "this" entry
    // this function is only called from inside li elements
    "select" : function () {
        display.entry(this.entry, this.index);
        list.deselect();
        this.className = "select";
        list.selected = this;

        list.up.disabled = false;
        list.down.disabled = false; 
        list.in.disabled = false;
        list.out.disabled = false;
        buttons.state(true, true, true, !this.entry.encrypted);
    },

    "deselect" : function () {
        var lis = this.ul.getElementsByTagName("li");
        this.selected = null;
        for (var i=0;i<lis.length;i++)
            lis[i].className = "";

        this.up.disabled = true;
        this.down.disabled = true;
        this.in.disabled = true;
        this.out.disabled = true;
        buttons.state(false, false, false, null);
    },

    "dragging" : null,
    "dragStart" : function (e) {
        if (list.dragging == null) {
            list.dragging = this;

            // create place holder element
            list.placeholder = document.createElement("li");
            list.placeholder.setAttribute("id", "placeholder");
            list.placeholder.style.background = "#eee";
            list.placeholder.style.height = (this.clientHeight-10)+"px";
            this.parentNode.insertBefore(list.placeholder, this);

            // change position of dragged element to absolite equivalent
            this.style.width = this.clientWidth + 'px';
            this.style.top = (this.offsetTop-(this.clientHeight+2)
                           - list.lbox.scrollTop) + 'px';
            this.style.left = this.offsetLeft + 'px';
            this.setAttribute("id", "drag");

            // get mouse position so we can start moving with it
            this.mouseY = this.offsetTop+e.clientY;
        }
    },
    "dragMove" : function (e) {
        if (this.dragging != null) {
            // move dragged list item with mouse
            this.dragging.style.top = this.dragging.offsetTop
                                    + (e.clientY-this.dragging.mouseY) + 'px';
            this.dragging.mouseY = e.clientY;
            
            // calculate location of dragged list item's center
            var y = this.dragging.offsetTop
                  +(this.dragging.clientHeight/2)+this.lbox.scrollTop;

            // get list of list items other then placeholder and dragged items
            var l = [];
            var lis = this.dragging.parentNode.children;
            for (var i=0;i<lis.length;i++)
                if (lis[i].id == "")
                    l.push(lis[i]);

            // place placeholder based on dragged item's location
            for (var i=0;i<l.length;i++) {
                var top = l[i].offsetTop-2;
                var half = (l[i].clientHeight+1)/2;
                if (top < y && top + half >= y) {
                    l[i].parentNode.insertBefore(this.placeholder, l[i]);
                    break;
                }
                if (top + half < y && y < top + half * 2) {
                    if (i ==(l.length-1))
                        l[i].parentNode.appendChild(this.placeholder);
                    else
                        l[i].parentNode.insertBefore(this.placeholder, l[i+1]);
                    break;
                }
            }
        }
    },
    "dragEnd" : function (x, y) {
        if (this.dragging != null) {
            // replace placeholder with dragged list item
            this.dragging.parentNode.replaceChild(this.dragging, this.placeholder);

            // re-order entryManager's entries to match dragged's new location
            var lis = this.dragging.parentNode.children;
            for (var i=0;i<lis.length;i++) {
                if (lis[i].id == "drag" && this.dragging.index != i) {
                    var to = this.dragging.index.slice(0);
                    to.pop();
                    to.push(i);
                    entryManager.move(this.dragging.index, to);
                }
                lis[i].index.pop();
                lis[i].index.push(i);
            }

            // clean drag attribute
            this.dragging.removeAttribute("id");
            this.dragging.style.top = '0px';
            this.dragging.style.left = '0px';
            this.dragging.style.width = '';
            this.dragging.select();
            this.dragging = null;
            this.placeholder = null;
        }
    },

    // moves the selected entry up one
    "moveUp" : function () {
        if (this.selected) {
            var s = this.selected;
            var lis = s.parentNode.getElementsByTagName("li");
            var last = s.index[s.index.length-1];

            if (last != 0) {
                // entry manager move
                var from = s.index;
                var to = s.index.slice(0);
                to.push(to.pop()-1);
                entryManager.move(from, to);

                // list move
                lis[s.index-1].index = s.index;
                s.index[s.index.length-1]--;
                s.parentNode.insertBefore(s, lis[s.index]);
            }
        }
    },

    // moves the selected entry down one
    "moveDown" : function () {
        if (this.selected) {
            var s = this.selected;
            var lis = s.parentNode.getElementsByTagName("li");
            var last = s.index[s.index.length-1];

            if (last < lis.length-1) {
                // entry manager move
                var from = s.index;
                var to = s.index.slice(0);
                to.push(to.pop()+1);
                entryManager.move(from, to);

                // list move
                lis[last+1].index = s.index;
                s.index[s.index.length-1]++;
                if (last != lis.length-1) {
                    s.parentNode.insertBefore(s, lis[last+2]);
                } else {
                    s.parentNode.appendChild(s);
                }
            }
        }
    },

    // moves the selected entry inside the one above it
    "moveIn" : function () {
        // if there is a selected list item
        // and it is not the first item of a list
        if (this.selected) {
            var s = this.selected;
            var last = s.index[s.index.length-1];

            if (last != 0) {
                var from = s.index;
                var to = from.slice(0);
                to.push(to.pop()-1);
                to.push(0);
                entryManager.move(from, to);
                this.build();
            } else {
                alert("no entry above this to enter");
            }
        } else {
            alert("selected undefined");
        }
    },

    // moves the selected entry out of it's containing entry
    "moveOut" : function () {
        // if there is a selected list item
        // and it is within another list item
        if (this.selected) {
            var s = this.selected;
            if (s.index.length > 1) {
                var from = s.index;
                var to = from.slice(0);
                to.pop();
                to.push(to.pop()+1);
                entryManager.move(from, to);
                this.build();
            }
        }
    }
}

// manage the page's buttons
var buttons = {
    // set up buttons
    "init" : function () {
        var b = ["new", "edit", "delete", "crypt", "save", "load", "config", "help", "up", "down", "in", "out"];
        for (var i=0;i<b.length;i++) {
            this.dom[b[i]] = document.getElementById(b[i]);
            this.dom[b[i]].addEventListener("click", function () {
                buttons[new String(this.id)]();
            }, false);
        }
    },

    "dom" : {
        "new" : null,
        "edit" : null,
        "delete" : null,
        "crypt" : null,
        "save" : null,
        "load" : null,
        "config" : null,
        "help" : null,
    },

    // builds/displays the "create new password entry" form
    "new" : function () {
        list.deselect();
        entryManager.index = [];

        var p = document.createElement("p");
        p.innerHTML = "Fill out the following form and press submit to create a new password entry:";

        var table = display.formTable();
        var button = table.getElementsByTagName("button")[0];
        display.addRow(button, "Username");
        display.addRow(button, "Password");

        button = document.createElement("button");
        button.innerHTML = "Create New Entry";
        button.setAttribute("class", "submit");
        button.addEventListener("click", function () {
            var pass1 = document.getElementById("pass1").value;
            var pass2 = document.getElementById("pass2").value;
            if (pass1 != pass2) {
                alert ("Could not create entry, passwords do not match!");
                pass1.style.border = "1px solid #f00";
                pass1.style.boxShadow = "0 0 4px 0 #f00";
                pass2.style.border = "1px solid #f00";
                pass2.style.boxShadow = "0 0 4px 0 #f00";
                return;
            }
            if (pass1 == "")
                if ( !confirm("No password set, are you sure you don't want to set a password?"))
                    return;
            var title = document.getElementById("title").value;
            var desc = document.getElementById("desc").value;
            var secret = {};

            var count = document.getElementById("count").index;
            for (var i=0;i<count;i++) {
                if (document.getElementById("k"+i)) {
                    var key = document.getElementById("k"+i).value;
                    key += (key=="entries")?":":""; // entries is reserved
                    secret[key] = document.getElementById("v"+i).value;
                }
            }
            entryManager.new(title, desc, secret, pass1);
            list.build();
        }, false);

        display.byElements("Create New Entry", [p, table, button]);
    },

    // builds/displays the "edit current password entry" form
    "edit" : function () {
        if (entryManager.index.length == 0) {
            display.byStrings("Error", "<p>Current entry could not be edited because the current entry could not be found.</p>");
            return;
        }
        var p = document.createElement("p");
        p.innerHTML = "Edit the following form and press submit to edit this password entry:";

        var entry = entryManager.get().entry;
        var table = display.formTable(
                entry.title, entry.description, entry.encrypted);

        var button = table.getElementsByTagName("button")[0];
        if (!entry.encrypted) {
            for (var i in entry.secret) {
                if (i != "entries") {
                    display.addRow(button, i, entry.secret[i]);
                }
            }

            button = document.createElement("button");
            button.innerHTML = "Edit Current Entry";
            button.setAttribute("class", "submit");
            button.addEventListener("click", function () {
                var pass1 = document.getElementById("pass1");
                var pass2 = document.getElementById("pass2");
                if (pass1.value != pass2.value) {
                    alert ("Could not create entry, passwords do not match!");
                    pass1.style.border = "1px solid #f00";
                    pass1.style.boxShadow = "0 0 4px 0 #f00";
                    pass2.style.border = "1px solid #f00";
                    pass2.style.boxShadow = "0 0 4px 0 #f00";
                    return;
                } else {
                    pass1 = pass1.value;
                }

                var title = document.getElementById("title").value;
                var desc = document.getElementById("desc").value;
                var secret = {};

                var count = document.getElementById("count").index;
                for (var i=0;i<count;i++) {
                    if (document.getElementById("k"+i)) {
                        var key = document.getElementById("k"+i).value;
                        key += (key=="entries")?":":""; // entries is reserved
                        secret[key] = document.getElementById("v"+i).value;
                    }
                }
                entryManager.edit(title, desc, secret, (pass1==""?null:pass1));
                list.build();
            }, false);
        } else {
            button = document.createElement("button");
            button.innerHTML = "Edit Current Entry";
            button.setAttribute("class", "submit");
            button.addEventListener("click", function () {
                var title = document.getElementById("title").value;
                var desc = document.getElementById("desc").value;
                entryManager["edit"](title, desc);
                display.current();
                list.build();
            }, false);
        }

        display.byElements(null, [p, table, button]);
    },

    // promts the user to confirm entry deletion
    "delete" : function () {
        if (entryManager.index.length == 0) {
            display.byStrings("Error", "<p>Current entry could not be deleted because the current entry could not be found.</p>");
            return;
        }
        if (confirm("Are you sure you want to delete this entry?\nOnce it's deleted, it's gone forever.")) {
            entryManager["delete"]();
            list.build();
            display.byStrings("Entry Deleted", "<div style='width: 100%; height: 100%; background: #ccc;'></div>");
        } else {
            display.current();
        }
    },

    // displays the encrypt or decrypt form depending on which is called for
    "crypt" : function () {
        var entry = entryManager.get().entry;
        if (entry.encrypted) {
            this.decrypt();
        }
        if (!entry.encrypted) {
            this.encrypt();
        }
    },

    // builds/displays the "encrypt current password entry" form
    "encrypt" : function () {
        entryManager.encrypt();
        display.current();
        list.build();
    },

    // builds/displays the "decrypt current password entry" form
    "decrypt" : function () {
        var h2 = document.createElement("h2");
        h2.innerHTML = "Decrypt this Entry?";

        var p = document.createElement("p");
        p.innerHTML = "Password: ";

        var de = function () {
            entryManager.decrypt(document.getElementById("password").value);
            list.build();
        }

        var input = document.createElement("input");
        input.setAttribute("type", "password");
        input.setAttribute("id", "password");
        input.addEventListener("keypress", function (e) {
            var code = (e.keyCode ? e.keyCode : e.which);
            if (code == 13) {
                de();
            }
        }, false);
        p.appendChild(input);

        var yes = document.createElement("button");
        yes.innerHTML = "yes";
        yes.addEventListener("click", de, false);

        var no = document.createElement("button");
        no.innerHTML = "No";
        no.addEventListener("click", function () {
            display.current();
        }, false);
        display.byElements(null, [h2, p, yes, no]);

    },

    // save to file
    "save" : function () {
        entryManager.toFile();
    },

    // load from file
    "load" : function () {
        entryManager.fromFile();
    },

    // move selected entry up
    "up" : function () {
        list.moveUp();
    },

    // move selected entry down
    "down" : function () {
        list.moveDown();
    },

    // move selected entry into the entry immediately above it
    "in" : function () {
        list.moveIn();
    },

    // move selected entry out of the entry containing it
    "out" : function () {
        list.moveOut();
    },

    // build config page
    "config" : function () {
        document.getElementById("header").innerHTML = "Settings";
        var body = document.getElementById("body");
        body.innerHTML = "";
        var c = entryManager.config;

        var table = document.createElement("table");
        table.setAttribute("class", "form");
        // salt
        var tr = document.createElement("tr");
        var th = document.createElement("th");
        var td = document.createElement("td");
        th.innerHTML = "Salt";
        td.innerHTML = '<input id="salt" value="' + c.salt + '" />';
        tr.appendChild(th);
        tr.appendChild(td);
        table.appendChild(tr);

        function checkbox (txt, id, field) {
            var tr = document.createElement("tr");
            var th = document.createElement("th");
            var td = document.createElement("td");
            th.innerHTML = txt;
            td.innerHTML = '<input id="'+id+'" type="checkbox" '
                +(field?"checked":"")+' />';
            tr.appendChild(th);
            tr.appendChild(td);
            table.appendChild(tr);
        }
        checkbox("Save on Edit", "saveedit", c.saveEdit);
        checkbox("Save on New", "savenew", c.saveNew);
        checkbox("Save on Delete", "savedelete", c.saveDelete);
        checkbox("Save on Move", "savemove", c.saveMove);
        checkbox("Encrypt on Edit", "enedit", c.enEdit);
        checkbox("Encrypt on New", "ennew", c.enNew);
        
        var button = document.createElement("button");
        button.setAttribute("class", "submit");
        button.innerHTML = "Save Changes";
        button.addEventListener("click", function () {
            entryManager.config.salt = 
                document.getElementById("salt").value;
            entryManager.config.saveEdit =
                document.getElementById("saveedit").checked;
            entryManager.config.saveNew =
                document.getElementById("savenew").checked;
            entryManager.config.saveDelete =
                document.getElementById("savedelete").checked;
            entryManager.config.saveMove =
                document.getElementById("savemove").checked;
            entryManager.config.enEdit =
                document.getElementById("enedit").checked;
            entryManager.config.enNew =
                document.getElementById("ennew").checked;
            entryManager.save();
            display.current();
        }, false);

        body.appendChild(table);
        body.appendChild(button);
    },

    // display help information
    "help" : function () {
        var h = document.getElementById("header");
        h.innerHTML = "Help";
        var b = document.getElementById("body");
        b.innerHTML = document.getElementById("help_page").innerHTML;
    },

    // governs which buttons are enabled and whether it says Encrypt or Decrypt
    "state"  : function (e, d, c, encrypt) {
        if (e != null)
            this.dom["edit"].disabled = !e;
        if (d != null)
            this.dom["delete"].disabled = !d;
        if (c != null)
            this.dom["crypt"].disabled = !c;
        if (encrypt != null)
            this.dom["crypt"].innerHTML = encrypt?"Encrypt":"Decrypt";
    },
}

// manage where the display box and list box are
function layout () {
    var main = document.getElementById("main");
    var head = document.getElementById("header");
    var body = document.getElementById("body");
    var lbox = document.getElementById("lbox");
    var button = document.getElementsByTagName("button")[0];

	for (var i=0;i<body.children.length;i++)
		body.children[i].style.display = "none";
	for (var i=0;i<lbox.children.length;i++)
		lbox.children[i].style.display = "none";

    head.style.height = (window.innerHeight*0.1) + "px";
    main.style.height = (window.innerHeight*0.98) + "px";
    main.style.width = (window.innerWidth*0.98-10) + "px";
    main.style.marginTop = (window.innerHeight*0.01) + "px";
    main.style.marginBottom = (window.innerHeight*0.01) + "px";

    body.style.height="";
    body.style.width ="";
    lbox.style.height="";
    lbox.style.width ="";
    body.style.height=body.clientHeight+"px";
    body.style.width =body.clientWidth +"px";
    lbox.style.height=(lbox.parentNode.clientHeight-2
            *(button.clientHeight)-10) +"px";
    lbox.style.width =lbox.clientWidth +"px";

	for (var i=0;i<body.children.length;i++)
		body.children[i].style.display = "";
	for (var i=0;i<lbox.children.length;i++)
		lbox.children[i].style.display = "";
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

// initialize everything
window.addEventListener("load", function () {
    entryManager.init();
    display.init();
    list.init();
    buttons.init();
    layout();
    window.onresize = function () {layout();}
    list.build();
    buttons.state(false, false, false, true);
    if (entryManager.entries.length > 0) {
        list.get([0]).select();
    }
}, false);
