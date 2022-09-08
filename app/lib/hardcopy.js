const fs = require('fs');
const path = require('path');

const SOURCE_ENTRY_POINT = '/media/oodsoft/NSR/NARI/emm030BMB';
const DEST_ENTRY_POINT = '/media/oodsoft/HPUSB1/TOPSECRETE/emm030-tmt';

const SOURCE_DIR = '/media/oodsoft/NSR/NARI/emm030GBP/emm030GBP_300115_3000_all';
const DEST_DIR = '/media/oodsoft/HPUSB1/TOPSECRETE/emm030';

const formatStr = function (str) {
  var args = [].slice.call(arguments, 1);
  var i = 0;
  return str.replace(/%s/g, () => args[i++]);
}

const doReadGallery = function(srcEntry, destEntry){
  fs.readdir(srcEntry, async(err, ggdirs) => {
    await ggdirs.forEach(async(gallery, i) => {
      let destCreateRes = await doCreateDestGallery(destEntry, gallery);
      let srcGallery = srcEntry + '/' + gallery;
      fs.readdir(srcGallery, async(err, files) => {
        await files.forEach(async(file, i) => {
          let src = formatStr('%s/%s/%s', srcEntry, gallery, file);
          console.log(src);
          let dest = formatStr('%s/%s/%s', destEntry, gallery, file);
          console.log(dest);
          await doCopy(src, dest);
          await doReadFile(dest);
        });
      });
    });
  });
}

const doCopyGallery = function(srcEntry, destEntry){
  return new Promise(function(resolve, reject) {
    fs.readdir(srcEntry, (err, ggfiles) => {
      ggfiles.forEach(async(file, i) => {
        let src = formatStr('%s/%s', srcEntry, file);
        let dest = formatStr('%s/%s', destEntry, file);
        await doCopy(src, dest);
        await doReadFile(dest);
        resolve();
      });
    });
  });
}

const doCopy = function(src, dest){
  return new Promise(function(resolve, reject) {
    fs.createReadStream(src).pipe(fs.createWriteStream(dest));
    resolve();
  });
}

const doCreateDestGallery = function(destEntry, gallery){
 return new Promise(function(resolve, reject) {
   let targetDir = path.resolve(destEntry, gallery);
   fs.mkdir(targetDir, { recursive: true }, async(err) => {
     if (err) {
       console.error(err);
       reject(err)
     } else {
       resolve(targetDir);
     }
   });
 });
}

const doReadFile = function(filePath){
  return new Promise(function(resolve, reject) {
    fs.readFile(filePath, (err, file) => {
      if (err) {
        reject(err)
      } else {
        console.log(file);
        resolve();
      }
    });
  });
}

const doTestReadFiles = function(entryPoint){
  fs.readFile(entryPoint, (err, files) => {
    if (err){
      console.log(err);
    } else {
      console.log(files);
    }
  });
}

const run = function(){
  doReadGallery(SOURCE_ENTRY_POINT, DEST_ENTRY_POINT);
}

const copy = function(){
  doCopyGallery(SOURCE_DIR, DEST_DIR).then((res)=>{
    console.log(res);
  })
}
run();
////copy();
//doTestReadFiles(DEST_ENTRY_POINT)
//doTestReadFiles('/media/oodsoft/NSR/NARI/emm030BMB/emm030BMB_303967_3000_all');
