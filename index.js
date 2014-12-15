var fs, BufferReader, PNGImage, sprFile, baseColor, base;

fs           = require('fs');
sprFile      = process.argv[2];

// Checking if pass one argument
if(sprFile && sprFile.length < 6) {
  throw new Error('Missing Tibia.spr.');
}

// Checking if extension is .spr
if(sprFile.substring((sprFile.length - 4), sprFile.length) != '.spr') {
  throw new Error('Only .spr is allowed!');
}

// Checking if file exists
if(!fs.existsSync(sprFile)) {
  throw new Error('File not found: ' + sprFile);
}

BufferReader = require('buffer-reader');
PNGImage     = require('pngjs-image');
baseColor    = {red: 255, green: 0, blue: 255, alpha: 255};

// Create a 32x32 with pink bg
base         = function() {
  var image = PNGImage.createImage(32, 32);
  for(i = 0; i < 32; i++) {
    for(j = 0; j < 32; j++) {
      image.setPixel(i,j, baseColor);
    }
  }

  return image;
}

fs.readFile(sprFile, function (err, buffer) {
  if (err) throw err;

  var reader = new BufferReader(buffer),

  info = {
    signature: reader.nextUInt32LE(),
    size: reader.nextUInt16LE(),
  };

  console.log("Signature: " + info.signature);
  console.log("  Sprites: " + info.size);

  for(var spriteId = 0; spriteId < info.size; spriteId++) {
    if(spriteId < 2) continue;

    var image = base();

    var formula = 6 + (spriteId - 1) * 4;

    reader.seek(formula);
    reader.seek(reader.nextUInt32LE() + 3);

    var offset = reader.tell() + reader.nextUInt16LE();

    var currentPixel = 0;
    var size = 32;
    var pixels = [];
    var colors = [];
    while(reader.tell() < offset) {
      var transparentPixels = reader.nextUInt16LE();
      var coloredPixels = reader.nextUInt16LE();
      currentPixel += transparentPixels;
      for (var i = 0; i < coloredPixels; i++)
      {
        image.setPixel(
          parseInt(currentPixel % size),
          parseInt(currentPixel / size),
          {red:reader.nextUInt8(), green:reader.nextUInt8(), blue:reader.nextUInt8(), alpha:255});
        currentPixel++;
      }
    }

    image.writeImage('./out/' + spriteId + '.png', function() {});

    // Caution: when removing the bottom line, it is possible to happen memory leak and blow up your pc.
    if(spriteId == 15) break;
  }

  console.log('Done!');

});
