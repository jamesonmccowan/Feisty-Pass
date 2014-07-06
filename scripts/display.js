// manage the password entries
var entryManager = {
    // load entries
    "init" : function () {
        this.load();
    },

    // creates a new "entry" object
    "create" : function (title, desc, secret) {
        var entry = {
            "title" : title,
            "description" : desc,
        };
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
    "new" : function (title, desc, secret) {
        this.entries.push(this.create(title, desc, secret));
        this.save();
    },

    // adds a new "entry" object and adds it to the list
    "add" : function (entry) {
        this.entries.push(entry);
        this.save();
    },

    // edits the current entry
    "edit" : function (title, desc, secret) {
        if (this.index > -1) {
            var entry = this.entries[this.index];
            entry.title = title;
            entry.description = desc;
            entry.secret = secret;
            this.save();
        } else {
            alert ("Error: Could not edit entry because no entry is selected");
        }
    },

    // delete current entry
    "delete" : function (index) {
        if (index >= 0 && index < this.entries.length) {
            // delete specified
            this.entries.splice(index, 1);

            // adjust current entry to account for changes in entry list
            if (index == this.index) {
                this.index = -1;
            } else if (index < this.index) {
                this.index--;
            }
        } else if (index == null) {
            // delete current
            if (this.index > -1) {
                this.entries.splice(this.index, 1);
                this.index = -1;
            }
        }

        this.save();
    },

    // encrypt secret section of current entry
    "encrypt" : function (e) {
        // use password's hash to encrypt
        // do not use the password directly as that would force it to be unsecure
        if (e == null) {
            if (this.index != -1) {
                e = this.entries[this.index];
            } else {
                return;
            }
        }

        if (!e.encrypted) {
            e.secret = str2hex(JSON.stringify(e.secret));
            e.encrypted = true;
        }
    },

    // decrypt secret section of current entry
    "decrypt" : function (e) {
        if (e == null) {
            if (this.index != -1) {
                e = this.entries[this.index];
            } else {
                return;
            }
        }

        if (e.encrypted) {
            e.secret = JSON.parse(hex2str(e.secret));
            e.encrypted = false;
        }
    },

    // save entries as JSON strings
    "save" : function () {
        if (typeof localStorage != "undefined") {
            localStorage.setItem('entries', JSON.stringify(this.entries));
        }
    },

    // load entries from JSON strings
    "load" : function () {
        if (typeof window.localStorage != "undefined" && typeof JSON != "undefined") {
            var state = JSON.parse(window.localStorage.getItem('entries'));
            if (state != null) {
                this.entries = state;
            }
        }
    },

    "index" : -1,
    "entries" : [],
    // idea for sub-indexing:
    // an array starting with the entry in the main list,
    // and then the next entry in the array is for the subentry of the previously selected entry
}

// provide helpful display functions
var display = {
    "init" : function () {
        display.header = document.getElementById("header");
        display.body = document.getElementById("body");
    },
    "header" : null,
    "body" : null,

    // set the display's content by a header and body string
    "byStrings" : function (header, body) {
        if (header != null) {
            this.header.innerHTML = header;
        }
        if (body != null) {
            this.body.innerHTML = body;
        }
    },

    // set the display's content by a header string and an array of dom elements to append to the body
    "byElements" : function (header, list) {
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
        var th = document.createElement("th");
        var td = document.createElement("td");
        var input = document.createElement("input");

        // key input box
        input.setAttribute("id", "k" + that.index);
        input.setAttribute("value", (key==null?that.index:key));
        th.appendChild(input);
            
        // valuke input box
        var input = document.createElement("input");
        input.setAttribute("id", "v" + that.index);
        input.setAttribute("value", (value==null?"":value));
        td.appendChild(input);

        // delete row button
        var input = document.createElement("button");
        input.innerHTML = "X";
        input.addEventListener("click", function () {
            this.parentNode.parentNode.parentNode.removeChild(this.parentNode.parentNode);
        }, false);
        td.appendChild(input);

        tr.appendChild(th);
        tr.appendChild(td);
        that.parentNode.parentNode.parentNode.appendChild(tr);
        that.index++;
    },

    "formTable" : function (title, desc) {
        var table = document.createElement("table");
        var tr = document.createElement("tr");
        var th = document.createElement("th");
        var td = document.createElement("td");
        th.innerHTML = "Title";
        if (title == null)
            td.innerHTML = '<input id="title" />';
        else
            td.innerHTML = '<input id="title" value="' + title + '" />';
        tr.appendChild(th);
        tr.appendChild(td);
        table.appendChild(tr);

        tr = document.createElement("tr");
        th = document.createElement("th");
        td = document.createElement("td");
        th.innerHTML = "Description";
        td.innerHTML = '<textarea id="desc" value="">' + desc + '</textarea>';
        tr.appendChild(th);
        tr.appendChild(td);
        table.appendChild(tr);

        tr = document.createElement("tr");
        td = document.createElement("td");
        td.colspan = "2";
        td.innerHTML = '<button onclick="display.addRow(this)" id="count">More Rows</button>';
        tr.appendChild(td);
        table.appendChild(tr);

        return table;
    },

    "entry" : function (e, index) {
        var encrypted = document.createElement("div");
        encrypted.innerHTML="<b>Status</b>: " + (e.encrypted?"Encrypted":"Decrypted");
        encrypted.setAttribute("class", "encrypted");

        var description = document.createElement("p");
        description.innerHTML = e.description;
        description.setAttribute("class", "description");

        var secret;
        if (!e.encrypted) {
            secret = document.createElement("table");
            for (var i in e.secret) {
                if (typeof e.secret[i] == "string") {
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
            secret = document.createElement("div");
            secret.innerHTML = e.secret;
        }
        secret.setAttribute("class", "secret");

        if (index >= 0) {
            entryManager.index = index;
        } else {
            entryManager.index = -1;
        }

        this.byElements(e.title, [encrypted, description, secret]);
        buttons.state(true, true, true, !e.encrypted);
    },

    "current" : function () {
        this.entry(entryManager.entries[entryManager.index], entryManager.index);
    }
}

// manage the page's list
var list = {
    "init" : function () {
        this.lbox = document.getElementById("lbox");

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

    "build" : function () {
        var l = entryManager.entries;
        this.ul = document.createElement("ul");

        // build each list item
        for (var i=0;i<l.length;i++) {
            var li = document.createElement("li");
            li.innerHTML = l[i].title;
            li.entry = l[i];
            li.index = i;

            li.select = this.select;
            li.start = this.dragStart;
            li.addEventListener("mousedown", function (e) {
                this.start(e.clientX, e.clientY);
            }, false);

            this.ul.appendChild(li);
        }
        var lis = this.ul.getElementsByTagName("li");

        // add list to page
        this.lbox.innerHTML = "";
        this.lbox.appendChild(this.ul);
        
        // select list item matching current entry
        if (entryManager.index >= 0) {
            lis[entryManager.index].select();
        }
    },

    // select "this" entry
    // this function is only called from inside li elements
    "select" : function () {
        display.entry(this.entry, this.index);
        list.deselect();
        this.className = "select";
    },

    "deselect" : function () {
        var lis = this.ul.getElementsByTagName("li");
        for (var i=0;i<lis.length;i++)
            lis[i].className = "";
    },

    "dragging" : null,
    "dragStart" : function (e) {
        if (list.dragging == null) {
            list.dragging = this;

            // create place holder element
            list.placeholder = document.createElement("li");
            list.placeholder.setAttribute("id", "placeholder");
            list.placeholder.style.background = "#eee";
            list.placeholder.style.height = (this.clientHeight-10)+"px"; //-10 for padding
            this.parentNode.insertBefore(list.placeholder, this);
            list.lis = list.ul.getElementsByTagName("li");

            // change position of dragged element to absolite equivalent
            this.style.width = this.clientWidth + 'px';
            this.style.top = (this.offsetTop-(this.clientHeight+2)) + 'px';
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
            var y = this.dragging.offsetTop+(this.dragging.clientHeight/2);

            // get list of list items other then placeholder and dragged items
            var l = [];
            for (var i=0;i<this.lis.length;i++)
                if (this.lis[i].id == "")
                    l.push(this.lis[i]);

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
            for (var i=0;i<this.lis.length;i++) {
                if (this.lis[i].id == "drag") {
                    entryManager.entries.splice(this.dragging.index, 1);
                    entryManager.entries.splice(i, 0, this.dragging.entry);
                }
                this.lis[i].index = i;
            }

            // clean drag attribute
            this.dragging.removeAttribute("id");
            this.dragging.style.top = '0px';
            this.dragging.style.left = '0px';
            this.dragging.style.width = '';
            this.dragging.select();
            this.dragging = null;
            this.placeholder = null;
            entryManager.save();
        }
    }
}

// manage the page's buttons
var buttons = {
    // set up buttons
    "init" : function () {
        this.dom["new"] = document.getElementById("new");
        this.dom["new"].addEventListener("click", function () {
            buttons["new"]();
        }, false);

        this.dom["edit"] = document.getElementById("edit");
        this.dom["edit"].addEventListener("click", function () {
            buttons["edit"]();
        }, false);

        this.dom["delete"] = document.getElementById("delete");
        this.dom["delete"].addEventListener("click", function () {
            buttons["delete"]();
        }, false);

        this.dom["crypt"] = document.getElementById("crypt");
        this.dom["crypt"].addEventListener("click", function () {
            buttons["crypt"]();
        }, false);

        this.dom["p"] = document.getElementById("p");
        this.dom["p"].addEventListener("click", function () {
            layout.toPortrait();
        }, false);

        this.dom["l"] = document.getElementById("l");
        this.dom["l"].addEventListener("click", function () {
            layout.toLandscape();
        }, false);
    },

    "dom" : {
        "new" : null,
        "edit" : null,
        "delete" : null,
        "crypt" : null,
    },

    // builds/displays the "create new password entry" form
    "new" : function () {
        list.deselect();
        entryManager.index = -1;

        var p = document.createElement("p");
        p.innerHTML = "Fill out the following form and press submit to create a new password entry:";

        var table = display.formTable();

        var button = table.getElementsByTagName("button")[0];
        button.index = 0;
        display.addRow(button, "Username");
        display.addRow(button, "Password");

        button = document.createElement("button");
        button.innerHTML = "Create New Entry";
        button.addEventListener("click", function () {
            var title = document.getElementById("title").value;
            var desc = document.getElementById("desc").value;
            var secret = {};

            var count = document.getElementById("count").index;
            for (var i=0;i<count;i++) {
                if (document.getElementById("k"+i)) {
                    secret[document.getElementById("k"+i).value] = document.getElementById("v"+i).value;
                }
            }
            entryManager["new"](title, desc, secret);
            entryManager.index = entryManager.entries.length-1;
            display.current();
            list.build();
        }, false);

        display.byElements("Create New Entry", [p, table, button]);
        this.state(false, false, false, null);
    },

    // builds/displays the "edit current password entry" form
    "edit" : function () {
        if (entryManager.index == -1) {
            display.byStrings("Error", "<p>Current entry could not be edited because the current entry could not be found.</p>");
            return;
        }
        var p = document.createElement("p");
        p.innerHTML = "Edit the following form and press submit to edit this password entry:";

        var entry = entryManager.entries[entryManager.index];
        var table = display.formTable(entry.title, entry.description);
        var button = table.getElementsByTagName("button")[0];
        button.index = 0;
        for (var i in entry.secret) {
            display.addRow(button, i, entry.secret[i]);
        }

        button = document.createElement("button");
        button.innerHTML = "Edit Current Entry";
        button.addEventListener("click", function () {
            var title = document.getElementById("title").value;
            var desc = document.getElementById("desc").value;
            var secret = {};

            var count = document.getElementById("count").index;
            for (var i=0;i<count;i++) {
                if (document.getElementById("k"+i)) {
                    secret[document.getElementById("k"+i).value] = document.getElementById("v"+i).value;
                }
            }
            entryManager["edit"](title, desc, secret);
            display.current();
            list.build();
        }, false);

        display.byElements(null, [p, table, button]);
        this.state(true, true, true, null);
    },

    // promts the user to confirm entry deletion
    "delete" : function () {
        if (entryManager.index == -1) {
            display.byStrings("Error", "<p>Current entry could not be deleted because the current entry could not be found.</p>");
            return;
        }
        if (confirm("Are you sure you want to delete this entry?\nOnce it's deleted, it's gone forever.")) {
            entryManager.delete();
            list.build();
            display.byStrings("Entry Deleted", "<div style='width: 100%; height: 100%; background: #ccc;'></div>");
        }
        this.state(false, false, false, null);
    },

    // displays the encrypt or decrypt form depending on which is called for
    "crypt" : function () {
        if (entryManager.entries[entryManager.index].encrypted) {
            this.decrypt();
        }
        if (!entryManager.entries[entryManager.index].encrypted) {
            this.encrypt();
        }
    },

    // builds/displays the "encrypt current password entry" form
    "encrypt" : function () {
        var h2 = document.createElement("h2");
        h2.innerHTML = "Encrypt this Entry?";

        var p = document.createElement("p");
        if (typeof entryManager.entries[entryManager.index].hash != "undefined")
            p.innerHTML = "<button>Change Password</button>";
        else
            p.innerHTML = "Password: <input type=\"password\" id=\"password\"/>";

        var yes = document.createElement("button");
        yes.innerHTML = "yes";
        yes.addEventListener("click", function () {
            entryManager.encrypt();
            display.current();
        }, false);

        var no = document.createElement("button");
        no.innerHTML = "No";
        no.addEventListener("click", function () {
            display.current();
        }, false);
        display.byElements(null, [h2, p, yes, no]);
    },

    // builds/displays the "decrypt current password entry" form
    "decrypt" : function () {
        var h2 = document.createElement("h2");
        h2.innerHTML = "Decrypt this Entry?";

        var p = document.createElement("p");
        p.innerHTML = "Password: <input type=\"password\" id=\"password\"/>";

        var yes = document.createElement("button");
        yes.innerHTML = "yes";
        yes.addEventListener("click", function () {
            entryManager.decrypt();
            display.current();
        }, false);

        var no = document.createElement("button");
        no.innerHTML = "No";
        no.addEventListener("click", function () {
            display.current();
        }, false);
        display.byElements(null, [h2, p, yes, no]);

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
var layout = {
    "init" : function () {
        this.view = document.getElementById("view");
        this.list = document.getElementById("list");
        this.body = document.getElementById("body");
        this.lbox = document.getElementById("lbox");

        // make it so the header height doesn't change
        var h = document.getElementById("header");
        h.parentNode.style.height = h.clientHeight + "px";
        h.style.height = h.clientHeight + "px";

        var content = body.innerHTML;
        body.innerHTML = "<br />";

        // get proper fixed sizes for landscape
        this.landscape.body.height=(this.body.parentNode.clientHeight-10)+"px";
        this.landscape.body.width =(this.body.parentNode.clientWidth-10) +"px";
        this.landscape.lbox.height=(this.lbox.parentNode.clientHeight-10)+"px";
        this.landscape.lbox.width =(this.lbox.parentNode.clientWidth-10) +"px";

        // get proper fixed sizes for portrait
        this.toPortrait();
        this.portrait.body.height=(this.body.parentNode.clientHeight-10)+"px";
        this.portrait.body.width =(this.body.parentNode.clientWidth-10) +"px";
        this.portrait.lbox.height=(this.lbox.parentNode.clientHeight-10)+"px";
        this.portrait.lbox.width =(this.lbox.parentNode.clientWidth-10) +"px";

        this.toLandscape();
        body.innerHTML = content;
    },
    "isLandscape" : true,
    "view" : null,
    "list" : null,
    "body" : null,
    "lbox" : null,

    "setup" : function (styles) {
        for (var i in styles) {
            for (var j in styles[i]) {
                this[i].style[j] = styles[i][j];
            }
        }
    },

    "toPortrait" :function () {
        this.isLandscape = false;
        this.setup(this.portrait);
    },

    "toLandscape" :function () {
        this.isLandscape = true;
        this.setup(this.landscape);
    },

    "portrait" : {
        "view" : {
            "height" : "43.5%",
            "width" : "98%"
        },
        "list" : {
            "top" : "45.5%",
            "left" : "1%",
            "height" : "43.5%",
            "width" : "98%"
        },
        "body" : {
            //"height" : "0px", 
            //"width" : "0px"
        },
        "lbox" : {
            //"height" : "0px",
            //"width" : "0px"
        },
    },

    "landscape" : {
        "view" : {
            "height" : "88%",
            "width" : "48.5%"
        },
        "list" : {
            "top" : "1%",
            "left" : "50.5%",
            "height" : "88%",
            "width" : "48.5%"
        },
        "body" : {
            //"height" : "0px",
            //"width" : "0px"
        },
        "lbox" : {
            //"height" : "0px",
            //"width" : "0px"
        },
    },
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
    layout.init();
    
    list.build();
    buttons.state(false, false, false, true);
}, false);
