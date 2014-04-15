function Feistel(key, func, rounds, blockSize) {
    if (key != null) {
        this.key = key;
    } else {
        this.key = "any string will do";
    }

    if (func != null) {
        this.func = func;
    } else {
        if (typeof SHA512 != "undefined") {
           this.func = function (key, val) {
                var hash = SHA512(key + val);
                var ret = "";
                for (var i=0;i<hash.length;i+=2)
                    ret += String.fromCharCode(parseInt(hash.substr(i, 2), 16));
                return ret;
           }
        } else {
           this.func = function (key, val) {
                return key + val;
           }
        }
    }

    if (rounds != null) {
        this.rounds = rounds;
    } else {
        this.rounds = 10;
    }

    if (blockSize != null) {
        this.blockSize = blockSize;
    } else {
        this.blockSize = 64;
    }
}

Feistel.prototype = {
    // Pad out the string if needed, then run the string through the number of
    // rounds specified by {this.rounds}. Break the string in half, transform
    // the left side, then switch which half is on which side
    encrypt : function (str) {
        str = this.pad(str);
        for (var j=0; j<this.rounds; j++) {
            var ret = "";
            for (var i=0; i<str.length/this.blockSize; i++) {
                var left = str.substr(i*this.blockSize, this.blockSize/2);
                var right= str.substr((i+0.5)*this.blockSize, this.blockSize/2);
                ret += right + this.feistel(left, right);
            }
            str = ret;
        }
        return str;
    },

    // undo encrypt by carefully reversing what was done by encrypt
    decrypt : function (str) {
        for (var j=0; j<this.rounds; j++) {
            var ret = "";
            for (var i=0; i<str.length/this.blockSize; i++) {
                var right= str.substr(i*this.blockSize, this.blockSize/2);
                var left = str.substr((i+0.5)*this.blockSize, this.blockSize/2);
                ret += this.feistel(left, right) + right;
            }
            str = ret;
        }
        return this.unpad(str);
    },

    // Take two halfs of a string, run the right side through a pseudo-random
    // function. Take the return value of the pseudo-random function and xor it
    // with the left side. Return the results of the xor.
    feistel : function (left, right) {
        var f = this.func(this.key, right);
        var ret = "";
        for (var i=0;i<f.length && i<left.length;i++)
            ret += String.fromCharCode(left.charCodeAt(i) ^ f.charCodeAt(i));
        return ret; 
    },

    // pads a string to be divisible by blockSize
    pad : function (str) {
        while (str.length % this.blockSize != 0) {
            str += " ";
        }
        return str;
    },

    // removes padding
    unpad : function (str) {
        return str.replace(/ *$/,"");
    },
}
