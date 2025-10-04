/**
 * Root handler - serves the main app
 */
exports.handler = function(context, event, callback) {
  const assets = Runtime.getAssets();
  const asset = assets['/index.html'];

  const response = new Twilio.Response();
  response.appendHeader('Content-Type', 'text/html');

  // Read and serve the index.html file
  const fs = require('fs');
  const indexPath = asset.path;
  const html = fs.readFileSync(indexPath, 'utf8');

  response.setBody(html);
  callback(null, response);
};
