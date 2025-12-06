function safeJSONStringify(obj) {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value.toString();
    }
    return value;
  });
}

function safeJSONParse(str) {
  return JSON.parse(str, (key, value) => {
    if (typeof value === 'string' && /^\d+$/.test(value) && value.length > 15) {
      return BigInt(value);
    }
    return value;
  });
}

module.exports = { safeJSONStringify, safeJSONParse };