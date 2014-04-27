// Variable that will hold the app's structure in memory as well as manage
// the transition of states for that structure.
var structure = {
    // stores the first sets, where each set can store sets and password entries
    master : {
        name : "Master List",
        notes : "Master list of passwords",
        key : "w4f53",
        hashedPassword : "",
        protocal : "",
        encryptNotes : false,
        encrypted : false,
        list : []
    },
    
    // generate a set for password entries
    /****
     * name : name of set
     * notes : whatever information that someone wants to keep with this set
     * key : key used for encrypting and decrypting entries
     * hashedPassword : the password to decrypt the password entries in the set
     * protocal : what method to use for encryption/decryption
     ****/
    Entry : function (name, notes, key, hashedPassword, protocal, encryptNotes) {
        var entry = {};
        entry.name = name;
        if (encryptNotes == false || encryptNotes == null) {
            entry.notes = notes;
        } else {
            // TODO: encrypt notes
            entry.notes = notes;
        }
        entry.key = key;
        entry.hashedPassword = hashedPassword;
        entry.protocal = protocal;
        entry.encryptNotes = encryptNotes
        entry.encrypted = true;
        entry.list = [];
        
        return entry;
    },

    // takes a JSON string and builds the sets of passwords
    fromStorage : function (json) {
        this.list = JSON.parse(localStorage.list);
    },

    // takes the sets of passwords and converts it into a JSON string
    toStorage : function () {
        for (var i=0;i<this.list.length;i++) {
            encrypt(this.list[i]);
        }
        localStorage.list = JSON.stringify(this.list);
    },

    // encrypt a given Set or Entry down recursively
    encrypt : function (target) {
    },

    // decrypt a given Set or Entry
    decrypt : function (target) {
    },

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
 
    display : {
        entry : function (s) {
            $("#list li a:parent").remove();
            $("#list li:first span:first").html(s.name);
            
            if (s.encrypted) {
                $("#list li:first span:last").html("Encrypted");
                $("#list li:nth-child(2) button").html("Decrypt");
            } else {
                $("#list li:first span:last").html("Decrypted");
                $("#list li:nth-child(2) button").html("Encrypt");
            }
            
            if (s.notes.length == 0) {
                $("#list li:nth-child(2) p").html("");
            } else {
                $("#list li:nth-child(2) p").html(s.notes);
            }
            if (typeof s.list == "object") {
                for (var i=0;i<s.list.length;i++) {
                    this.stub(s.list[i]);
                }
            }
        },

        /*<a href="format.html">
            <h2>PayPal</h2>
            <p>AF9B5EC03F943BC...</p>
            <p class="ui-li-aside"><strong>[Encrypted]</strong></p>
          </a>*/
        stub : function (s) {
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
        },

        editEntry : function (p) {
        },
    }
}


