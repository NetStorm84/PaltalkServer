// The key used for other parts of the system, not the password
const lymrick = "Ginger was a big fat horse, a big fat horse was she. But don"
                    "t tell that to MaryLou becuase in love with her is she.I tell you"
                    " this in private, because I thought that you should know.But neve"
                    "r say to MaryLou or both our heads will go.Ive said it onc"
                    "e, Ive said it twice, Ill say it once again.Not a w"
                    "ord of this to you know who or it will be our end!"; 

function decrypt(encryptedString, serverKey, keyOffset, variant) {
    const decryptedChars = []; // Array to hold each character
    const destination = lymrick.slice(); // Copy source to destination
    let counter = 0;

    for (let i = 0; i < encryptedString.length; i += 4) {
        const encryptedSegment = encryptedString.substring(i, i + 3);
        const encryptedNumber = parseInt(encryptedSegment); // Convert substring to integer
        const decryptedCharCode = encryptedNumber - destination.charCodeAt(keyOffset + counter) - 122 - counter;
        counter++;

        const decryptedChar = String.fromCharCode(decryptedCharCode & 0xFF); // Convert the number to an ASCII character
        decryptedChars.push(decryptedChar); // Push each character to the array
    }

    return decryptedChars.join(''); // Return a string of decrypted characters
}

function encrypt(plainText, serverKey, keyOffset, variant) {
    let encryptedString = "";
    const keyLength = lymrick.length;
    let counter = 0;

    for (let i = 0; i < plainText.length; i++, counter++) {
        const plainCharCode = plainText.charCodeAt(i);
        const keyCharCode = lymrick.charCodeAt((keyOffset + counter) % keyLength);
        const encryptedNumber = plainCharCode + keyCharCode + 122 + counter;

        // Ensure the number is four digits by formatting it
        let formattedNumber = encryptedNumber.toString();
        while (formattedNumber.length < 4) {
            formattedNumber += '0'; // Padding with zeroes to ensure four digits
        }

        encryptedString += formattedNumber;
    }

    return encryptedString;
}

module.exports = { encrypt, decrypt};