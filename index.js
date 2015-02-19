var fs, BufferReader, PNGImage, MultiBar, mbars, bars, sprFile, baseColor, base, async, exportImg, outDir;

fs      = require('fs');
sprFile = process.argv[2];
outDir  = process.argv[3];

// Checking if pass first argument
if(!sprFile || sprFile.length < 6) {
  throw new Error('Missing Tibia.spr.');
}

// Check if second arg passed otherwise set to default output
if(!outDir) {
  outDir = './out/';
}

// Check if last char is '/'
if(outDir.charAt(outDir.length-1) !='/') {
  outDir = outDir + '/';
}

if(!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

// Checking if extension is .spr
if(sprFile.substring((sprFile.length - 4), sprFile.length) != '.spr') {
  throw new Error('Only .spr is allowed!');
}

// Checking if file exists
if(!fs.existsSync(sprFile)) {
  throw new Error('File not found: ' + sprFile);
}

MultiBar     = require('./multibar.js');
mbars        = new MultiBar();
bars         = [];
BufferReader = require('buffer-reader');
PNGImage     = require('pngjs-image');
async        = require('async');
baseColor    = {red: 255, green: 0, blue: 255, alpha: 255};

// Create a 32x32 with pink bg
base = function(spriteId) {
  var image = PNGImage.createImage(32, 32);
  for(i = 0; i < 32; i++) {
    for(j = 0; j < 32; j++) {
      image.setPixel(i,j, baseColor);
    }
  }

  return {filename: spriteId, img: image};
}

exportImg = function(obj, cb) {
  obj.img.writeImage(outDir + obj.filename + '.png', function() {
    cb();
    bars[1].tick();
  });
};

var queue = async.queue(exportImg, 10);

queue.drain = function() {
  console.log("\n");
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

  bars.push(mbars.newBar('  Parsing: [:bar] :percent | ETA: :eta | Time Elapsed: :elapsed', { complete: '=', incomplete: ' ', clear: true, width: 40, total: info.size }));
  bars.push(mbars.newBar('Exporting: [:bar] :percent | ETA: :eta | Time Elapsed: :elapsed', { complete: '=', incomplete: ' ', clear: true, width: 40, total: info.size }));

  for(var spriteId = 0; spriteId < info.size; spriteId++) {
    if(spriteId < 2) continue;

    var obj = base(spriteId);
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
        obj.img.setPixel(
          parseInt(currentPixel % size),
          parseInt(currentPixel / size),
          {red:reader.nextUInt8(), green:reader.nextUInt8(), blue:reader.nextUInt8(), alpha:255});
        currentPixel++;
      }
    }

    queue.push(obj);
    bars[0].tick();
  }

});
