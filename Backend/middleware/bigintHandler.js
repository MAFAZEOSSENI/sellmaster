function bigIntHandler() {
  return (req, res, next) => {
    const originalSend = res.send;
    
    res.send = function(data) {
      if (typeof data === 'object') {
        data = JSON.stringify(data, (key, value) => {
          if (typeof value === 'bigint') {
            return value.toString();
          }
          return value;
        });
      }
      originalSend.call(this, data);
    };
    
    next();
  };
}

module.exports = bigIntHandler;