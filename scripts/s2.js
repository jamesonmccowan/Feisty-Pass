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
            this.notes = notes;
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
        for (i in name) {
            this[i] = name[i];
        }
    }
}

Entry.prototype = {
    // add an entry
    add : function (entry) {
        entry["parent"] = this;
        entry.index = this.list.length;
        this.list.push(entry);
    },

    // remove an entry
    remove : function (index) {
        this.list.splice(index, 1);
    },

    // encrypt this Entry and it's decendants down recursively
    encrypt : function () {
        if (!this.encrypted) {
            for (var i=0;i<this.list.length;i++) {
                this.list[i].encrypt();
                // TODO: actual encryption
            }
            if (this.encryptNotes) {
                // TODO: actual encryption
            }
            this.encrypted = true;
        }
    },

    // decrypt this Entry
    decrypt : function () {
        if (this.encrypted) {
            for (var i=0;i<this.list.length;i++) {
                // TODO: actual decryption
            }
            if (this.encryptNotes) {
                // TODO: actual decryption
            }
            this.encrypted = false;
        }
    },

    // displays this entry
    display : function () {
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
            a.setAttribute("href", "structure.html");
            
            name.innerHTML = s.name;
            notes.innerHTML = s.notes;
            
            state.setAttribute("class", "ui-li-aside");
            state.innerHTML = s.encrypted? "Encrypted" : "Decrypted";
            
            li.appendChild(a);
            a.appendChild(name);
            a.appendChild(notes);
            a.appendChild(state);
            document.getElementById("list").appendChild(li);
        }
        
        $("#list li a:parent").remove();
        $("#list li:first span:first").html(this.name);
            
        if (this.encrypted) {
            $("#list li:first span:last").html("Encrypted");
            $("#list li:nth-child(2) button").html("Decrypt");
        } else {
            $("#list li:first span:last").html("Decrypted");
            $("#list li:nth-child(2) button").html("Encrypt");
        }
            
        if (this.notes.length == 0) {
            $("#list li:nth-child(2) p").html("");
        } else {
            $("#list li:nth-child(2) p").html(this.notes);
        }
        if (typeof this.list == "object") {
            for (var i=0;i<this.list.length;i++) {
                stub(this.list[i]);
            }
        }
    },

    
}

var structure = {
    hex2str : function (hex) {
        var str = "";
        for (var i=0;i<hex.length;i+=2) {
            str += String.fromCharCode(parseInt(hex.substr(i, 2)), 16);
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
