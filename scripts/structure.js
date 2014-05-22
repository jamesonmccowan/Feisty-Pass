// Variable that will hold the app's structure in memory as well as manage
// the transition of states for that structure.
// generate a set for password entries
/****
 * name : name of set
 * notes : whatever information that someone wants to keep with this set
 * key : key used for encrypting and decrypting entries
 * hashedPassword : the password to decrypt the password entries in the set
 * protocal : what method to use for encryption/decryption
 ****/
var Entry = function (name, notes, key, hashedPassword, protocal, encryptNotes) {
    if (typeof name == "string") {
        this.name = name;

        if (encryptNotes == false || encryptNotes == null) {
            this.encryptNotes = false;
            this.notes = notes;
        } else {
            this.encryptNotes = true;
            // TODO: encrypt notes
            this.notes = structure.str2hex(notes);
        }

        if (typeof key == "string") {
            this.key = key;
        } else {
            this.key = "aRandomString";
        }

        if (typeof hashedPassword == "string") {
            this.hashedPassword = hashedPassword;
        }

        if (typeof protocal == "string") {
            this.protocal = protocal;
        } else {
            this.protocal = "Default";
        }

        this.encrypted = true;
        this.list = [];
    } else if (typeof name == "object") {
        for (var i in name) {
            this[i] = name[i];
        }
    }
}

Entry.prototype = {
    // add an entry
    add : function (entry) {
        entry["parent"] = this;
        entry.index = this.list.length;

        if (this.encrypted) {
            var en = structure.encryption(this.protocal);
            this.list.push(structure.str2hex(en(entry.toJSON())));
        } else {
            this.list.push(entry);
        }
    },

    // remove an entry
    remove : function (index) {
        this.list.splice(index, 1);
    },

    // encrypt this Entry and it's decendants down recursively
    encrypt : function () {
        if (!this.encrypted) {
            var en = structure.encryption(this.protocal);
            for (var i=0;i<this.list.length;i++) {
                this.list[i].encrypt();
                // TODO: actual encryption
                this.list[i] = structure.str2hex(en(this.list[i].toJSON()));
            }
            if (this.encryptNotes) {
                // TODO: actual encryption
                this.notes = structure.str2hex(en(this.notes));
            }
            this.encrypted = true;
        }
    },

    // decrypt this Entry
    decrypt : function () {
        if (this.encrypted) { 
            var de = structure.decryption(this.protocal);
            for (var i=0;i<this.list.length;i++) {
                // TODO: actual decryption
                this.list[i] = new Entry(JSON.parse(de(structure.hex2str(this.list[i]))));
                this.list[i]["parent"] = this;
                this.list[i].index = i;
            }
            if (this.encryptNotes) {
                // TODO: actual decryption
                this.notes = structure.hex2str(this.notes);
            }
            this.encrypted = false;
        }
    },

    // displays this entry
    display : function () {
        structure.current = this;
        if (structure.current == structure.master) {
            $(".hideOnMaster a").addClass("ui-state-disabled");
        } else {
            $(".hideOnMaster a").removeClass("ui-state-disabled");
        }

        if (this.encrypted) {
            $("#encryption-status").html("Encrypted");
            $("#list li:nth-child(1) button").html("Decrypt");
            $(".hideOnEncrypted a").addClass("ui-state-disabled");
        } else {
            $("#encryption-status").html("Decrypted");
            $("#list li:nth-child(1) button").html("Encrypt");
            $(".hideOnEncrypted a").removeClass("ui-state-disabled");
        }

        /*<a href="format.html">
            <h2>PayPal</h2>
            <p>AF9B5EC03F943BC...</p>
            <p class="ui-li-aside"><strong>[Encrypted]</strong></p>
          </a>*/
        var stub = function (s) {
            var li   = document.createElement("li");
            var a    = document.createElement("a");
            var name = document.createElement("h2");
            var notes= document.createElement("p");
            var state= document.createElement("p");
            
            a.setAttribute("class", "ui-btn ui-btn-icon-right ui-icon-carat-r");
            a.setAttribute("href", "#");
            a.addEventListener("click", function() {s.display();}, false);
            
            name.innerHTML = s.name;
            notes.innerHTML = s.notes;
            
            state.setAttribute("class", "ui-li-aside");
            state.innerHTML = s.encrypted? "Encrypted" : "Decrypted";
            
            li.setAttribute("class", "entry");
            li.appendChild(a);
            a.appendChild(name);
            a.appendChild(notes);
            a.appendChild(state);
            document.getElementById("list").appendChild(li);
        }

        $("#list .entry").remove();
        $("#list-title").html(this.name);
        document.title = this.name;
         
        if (this.notes == null || this.notes.length == 0) {
            $("#list li:nth-child(1) p").html("");
        } else {
            $("#list li:nth-child(1) p").html(this.notes);
        }
        if (typeof this.list == "object") {
            for (var i=0;i<this.list.length;i++) {
                if (typeof this.list[i] == "string") {
                    var li = document.createElement("li");
                    li.setAttribute("class", "entry");
                    li.innerHTML = this.list[i];
                    document.getElementById("list").appendChild(li);
                } else if (typeof this.list[i] == "object") {
                    stub(this.list[i]);
                }
            }
        }
    },

    toJSON : function () {
        var params = ['name', 'notes', 'key', 'hashedPassword', 'protocal', 'encrypted'];
        var str = '{';

        for (var i=0;i<params.length;i++) {
            if (typeof this[params[i]] != 'undefined') {
                str += '"' + params[i] + '":"' + this[params[i]] + '", ';
            } else {
                str += '"' + params[i] + '": null, ';
            }
        }

        str += '"list":[';
        if (typeof this.list != "undeined") {
            for (var i=0;i<this.list.length;i++) {
                if (typeof this.list[i] == "string") {
                    str += '"' + this.list[i] + '"';
                } else {
                    str += '"' + this.list[i].toJSON() + '"';
                }
                if (i+1 != this.list.length) {
                    str += ', ';
                }
            }
        }
        str += '], ';

        if (this.encryptNotes) {
            str += '"encryptNotes":true';
        } else {
            str += '"encryptNotes":false';
        }

        str += '}';
        return str;
    }
}

var structure = {
    hex2str : function (hex) {
        var str = "";
        for (var i=0;i<hex.length;i+=2) {
            str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
        }
        return str;
    },

    str2hex : function (str) {
        var ch = ["0","1","2","3","4","5","6","7","8","9","A","B","C","D","E","F"];
        var hex = "";
        for (var i=0;i<str.length;i++) {
            var num = str.charCodeAt(i);
            hex += ch[Math.floor(num / 16)] + ch[num % 16];
        }
        return hex;
    },

    toStorage : function () {
        this.master.encrypt();
        localStorage.setItem('entries', this.master.toJSON());
    },

    fromStorage : function () {
        var m = localStorage.getItem('entries');
        if (typeof m == "string") {
            this.master = new Entry(JSON.parse(m));
        }
    },

    encryption : function (str) {
        switch(str) {
            case "Default":
            default:
                return function (s) {
                    return s;
                };
        }
    },

    decryption : function (str) {
        switch(str) {
            case "Default":
            default:
                return function (s) {
                    return s;
                };
        }
    },

    master : new Entry({
        name : "Master List",
        notes : "Master list of passwords",
        key : "w4f53",
        hashedPassword : "",
        protocal : "",
        encryptNotes : false,
        encrypted : false,
        list : []
    }),
}

structure.fromStorage();
structure.current = structure.master;
window.addEventListener('unload', function(event) {
    structure.toStorage();    
});

