// Variable that will hold the app's structure in memory as well as manage
// the transition of states for that structure.
var structure = {
    // stores the first sets, where each set can store sets and password entries
    list : [],
    
    // generate a set for password entries
    /****
     * name : name of set
     * notes : whatever information that someone wants to keep with this set
     * key : key used for encrypting and decrypting entries
     * hashedPassword : the password to decrypt the password entries in the set
     * protocal : what method to use for encryption/decryption
     ****/
    Set : function (name, notes, key, hashedPassword, protocal, encryptNotes) {
        var set = {};
        set.name = name;
        if (encryptNotes == false || encryptNotes == null) {
            set.notes = notes;
        } else {
            // TODO: encrypt notes
            set.notes = notes;
        }
        set.key = key;
        set.hashedPassword = hashedPassword;
        set.protocal = protocal;
        set.encryptNotes = encryptNotes
        set.encrypted = true;
        set.list = [];
        
        return set;
    },

    // generate a password entry
    /****
     * name : name of password entry
     * notes : space for information to keep with this password (HTML string)
     * key : key used for encrypting and decrypting actual password
     * hashedPassword : password to decrypt the password entries in this Entry
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
        entry.encryptNotes = encryptNotes;
        entry.encrypted = true;
        
        return set;
    },


    // takes a JSON string and builds the sets of passwords
    fromStorageString : function (json) {
        this.list = JSON.parse(localStorage.list);
    },

    // takes the sets of passwords and converts it into a JSON string
    toStorageString : function () {
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
        return str;
    },

    str2hex : function (str) {
        var hex = "";
        return hex;
    },
}
