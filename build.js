
const dirname="Project3/www";
const prod=true;

const esbuild = require('esbuild');
const obfuscator = require('javascript-obfuscator');
const vm = require('vm');
const fs = require('fs');
const path = require('path');

const pako = require('./skeleton/js/pako.min.js');
// let srclist=[
//   'Actors.json',
//   'Classes.json',
//   'Skills.json',
//   'Items.json',
//   'Weapons.json',
//   'Armors.json',
//   'Enemies.json',
//   'Troops.json',
//   'States.json',
//   'Animations.json',
//   'Tilesets.json',
//   'CommonEvents.json',
//   'System.json',
//   'MapInfos.json'
// ];
function compressData(){
  const folderPath = './'+dirname+'/data';
  let content={};
  const files = fs.readdirSync(folderPath);
  files.forEach(file => {
    const filePath = path.join(folderPath, file);
    // console.log('read data file:'+filePath);
    const codep = fs.readFileSync(filePath, 'utf8');
    const updatedp = codep.replace(/(?<!var\s)\$data(\w*)/g, "BMScope['\$data$1']")
    .replace(/(?<!var\s)\$game(\w*)/g, "BMScope['\$game$1']")
    .replace(/(?<!var\s)\$test(\w*)/g, "BMScope['\$test$1']")
    content[file]=JSON.parse(updatedp);
    if(prod){
      fs.renameSync('./'+dirname+'/data/'+file,'./bak/data/'+file);
    }
  });
  const compressed =  new Uint8Array(pako.deflate(JSON.stringify(content), { to: 'string' }));
  const shifted = compressed.map(v => (v + 18) % 256);
  fs.writeFileSync('./'+dirname+'/dist/bundle2.js',shifted);
}

let files = [
  './'+dirname+'/js/rpg_core.js',
  './'+dirname+'/js/rpg_managers.js',
  './'+dirname+'/js/rpg_objects.js',
  './'+dirname+'/js/rpg_scenes.js',
  './'+dirname+'/js/rpg_sprites.js',
  './'+dirname+'/js/rpg_windows.js',
  './'+dirname+'/js/plugins.js',
  './skeleton/js/main1.js',
];
async function readPlugins(){
  const codep = fs.readFileSync('./'+dirname+'/js/plugins.js', 'utf8');
  const code = await codep;
  const context = {
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  context.$plugins.forEach(function(plugin) {
    if (plugin.status) {
        files.push('./'+dirname+'/js/plugins/'+plugin.name + '.js');
    }
  }, this);
  files.push('./skeleton/js/main2.js');
}
let target;
let bundlefile;
if(prod){
  target = './bak/output.js';
  // bundlefile='./bak/bundle.js';
  bundlefile='./'+dirname+'/dist/bundle.js';
}else{
  target = './'+dirname+'/dist/output.js';
  bundlefile='./'+dirname+'/dist/bundle.js';
}
async function cleanFile(){
  try{
    fs.writeFileSync(target, `\n`, 'utf8');
  }catch(err){
    console.error('Error clean file:', err);
  }
}

function genBakDir(){
  fs.mkdirSync("./bak/data",{ recursive: true });
  fs.mkdirSync('./'+dirname+'/dist',{ recursive: true });
  fs.mkdirSync('./bak/'+dirname+'/js/plugins',{ recursive: true });
  fs.cpSync("./skeleton/index.html",'./'+dirname+'/index.html');
  fs.cpSync('./skeleton/js/pako.min.js','./'+dirname+'/js/libs/pako.min.js');
}
// const regexForExtraJson = /_databaseFiles\.push\(\{name:\s*'[^']+',\s*src:\s*"([^"]+\.json)"\}\)/g;
const regexForName = /^function\s+([a-zA-Z_$][\w$]*)\s*\(.*?\)|^var\s+(\$[a-zA-Z_$][\w$]*)/gm;
var writeScope=true;
async function appendFiles() {
    let scope = [];

    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const replacedContent = content
      .replace(/(?<!var\s)(?<!')\$data(\w*)/g, "BMScope['\$data$1']")
      .replace(/(?<!var\s)(?<!')\$game(\w*)/g, "BMScope['\$game$1']")
      .replace(/(?<!var\s)(?<!')\$test(\w*)/g, "BMScope['\$test$1']")
      .replace(/window\[/g,'BMScope[');
      if(file.includes('plugins')){
        if(writeScope){
          fs.appendFileSync(target, `\nconst BMScope={${scope.toString()}}\n`);
          writeScope=false;
        }
        // let match;
        // while ((match = regexForExtraJson.exec(replacedContent)) !== null) {
        //     const fileName = match[1];
        //     console.log("Find extra json file:", fileName);
        //     srclist.push(fileName);
        // }
      }
      if(writeScope){
        let match;      
        while ((match = regexForName.exec(replacedContent)) !== null) {
          if (match[1]) scope.push(match[1]);
          if (match[2]) scope.push(match[2]);
        }
      }

      fs.appendFileSync(target, `\n\n${replacedContent}`);
      if(prod && file.includes(dirname)){
        fs.renameSync(file,'./bak/'+file);
      }      
    }
    console.log(`Appended all files to ${target}`);
}
async function buildProj(){
genBakDir();
await cleanFile();
await readPlugins();
await appendFiles();
compressData();

// const code = fs.readFileSync(target, 'utf8');
// const obfuscated = obfuscator.obfuscate(code, {
//   compact: true,
//   controlFlowFlattening: true,
//   // deadCodeInjection: true,
//   // stringArray: true,
//   // identifierNamesGenerator: "mangled",
//   // // stringArrayEncoding: ['base64'],
//   // stringArrayThreshold: 0.2,

// });

// fs.writeFileSync(''+dirname+'/dist/bundle.obfuscated.js', obfuscated.getObfuscatedCode());
esbuild.build({
  entryPoints: [target], 
  bundle: true,
  format:'iife',
  outfile: bundlefile,
  platform: 'browser', 
  minify:true,
  external:["fs","path","nw.gui"],
  // globalName:'xyz',
}).then(() => {
  const content = fs.readFileSync(bundlefile, 'utf8');
  const newcontent = content.replace(/catch\{/g,'catch(e){');
  fs.writeFileSync(bundlefile, newcontent, 'utf8');
    return;
    const code = fs.readFileSync(bundlefile, 'utf8');
    const obfuscated = obfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: false,
      deadCodeInjection: true,
      stringArray: true,
      identifierNamesGenerator: "mangled",
      // stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.2,
  
    });
  
    fs.writeFileSync(''+dirname+'/dist/bundle.obfuscated.js', obfuscated.getObfuscatedCode());
    console.log('Bundled, minified, and obfuscated!');
});
}
buildProj();