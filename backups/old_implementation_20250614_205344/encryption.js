// The key used for other parts of the system, not the password
const lymrick = "Ginger was a big fat horse, a big fat horse was she. But don"
                    "t tell that to MaryLou becuase in love with her is she.I tell you"
                    " this in private, because I thought that you should know.But neve"
                    "r say to MaryLou or both our heads will go.Ive said it onc"
                    "e, Ive said it twice, Ill say it once again.Not a w"
                    "ord of this to you know who or it will be our end!"; 

function encodeWithChallenge(s, challenge, variant) {
    let output = ''; // String to hold the encoded result
    const slen = s.length;

    for (let i = 0; i < slen; i++) {
        let encryptedNumber;

        switch (variant) {
            case 1:
                encryptedNumber = 0x7a + (i * (13 - i)) + s.charCodeAt(i) + lymrick.charCodeAt(challenge + i);
                break;
            case 2:
                encryptedNumber = 0x7a + i + s.charCodeAt(i) + lymrick.charCodeAt(challenge + i);
                break;
            case 3:
                encryptedNumber = 0x7a + s.charCodeAt(i) + lymrick.charCodeAt(i) + (challenge * i);
                challenge--;
                break;
            default:
                throw new Error("Invalid variant"); // Handle unexpected variant
        }

        // Convert the encrypted number to a string and ensure it is 4 digits
        let formattedNumber = encryptedNumber.toString();
        while (formattedNumber.length < 4) {
            formattedNumber += '0';
        }

        output += formattedNumber;
    }

    return output;
}

function decodeWithChallenge(s, challenge, variant) {
    let output = ''; // String to hold the decoded result
    const slen = s.length;

    // Ensure that the length of s is a multiple of 4
    if (slen % 4 !== 0) {
        throw new Error("Invalid input length");
    }

    for (let i = 0; i < slen / 4; i++) {
        // Extract the 4-digit block as a string
        const block = s.substring(i * 4, i * 4 + 4).replace(/0(?!.*0)$/, '');

        // Convert the block to an integer
        const n = parseInt(block, 10);

        let decryptedCharCode;

        switch (variant) {
            case 1:
                decryptedCharCode = n - 0x7a - (i * (13 - i)) - lymrick.charCodeAt(challenge + i);
                break;
            case 2:
                decryptedCharCode = n - 0x7a - i - lymrick.charCodeAt(challenge + i);
                break;
            case 3:
                decryptedCharCode = n - 0x7a - lymrick.charCodeAt(i) - (challenge * i);
                challenge--;
                break;
            default:
                throw new Error("Invalid variant");
        }

        // Convert the decrypted character code back to a character
        output += String.fromCharCode(decryptedCharCode);
    }

    return output;
}

// let encodedString = encodeWithChallenge('smtp.paltalk.fun:25:user:pass', 25, 2);
// let decodedString = decodeWithChallenge(encodedString, 25, 2);

// let encodedString = encodeWithChallenge('11111', 42, 1);
// let decodedString = decodeWithChallenge(encodedString, 42, 1);

// console.log('Encrypted:', encodedString);
// console.log('Decrypted:', decodedString);

module.exports = {encodeWithChallenge, decodeWithChallenge};