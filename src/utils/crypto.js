const crypto = require("crypto");
const { HASH_ALGORITHM, CIPHER_ALGORITHM } = require("../config");

const encrypt = (content, password) => {
  const iv = crypto.scryptSync(password, password, 16);
  const key = crypto.scryptSync(password, password, 32);
  const cipher = crypto.createCipheriv(CIPHER_ALGORITHM, key, iv);
  return cipher.update(content, "utf-8", "hex") + cipher.final("hex");
};

const decrypt = (content, password) => {
  const iv = crypto.scryptSync(password, password, 16);
  const key = crypto.scryptSync(password, password, 32);
  const message = crypto.createDecipheriv(CIPHER_ALGORITHM, key, iv);
  message.setAutoPadding(false);
  return message.update(content, "hex", "utf-8") + message.final("utf-8");
};

const hash = (content) => {
  const result = crypto
    .createHash(HASH_ALGORITHM)
    .update(content)
    .digest("hex");
  return result;
};

module.exports = { encrypt, decrypt, hash };
