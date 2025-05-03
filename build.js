
const dirname="Project1/www";
const esbuild = require('esbuild');
const obfuscator = require('javascript-obfuscator');
const vm = require('vm');
const fs = require('fs');
const pako = require('./skeleton/js/pako.min.js');
function compressData(){
  const srclist=[
    'Actors.json',
    'Classes.json',
    'Skills.json',
    'Items.json',
    'Weapons.json',
    'Armors.json',
    'Enemies.json',
    'Troops.json',
    'States.json',
    'Animations.json',
    'Tilesets.json',
    'CommonEvents.json',
    'System.json',
    'MapInfos.json'
  ];
  let content={};
  srclist.forEach((name)=>{
    const codep = fs.readFileSync('./'+dirname+'/data/'+name, 'utf8');
    content[name]=JSON.parse(codep);
    fs.renameSync('./'+dirname+'/data/'+name,'./bak/data/'+name);
  });
  const compressed = pako.deflate(JSON.stringify(content), { to: 'string' });
  fs.writeFileSync('./'+dirname+'/dist/bundle2.js',compressed);
//   const decom = pako.inflate(compressed, { to: 'string' });
//   console.log(JSON.parse(decom));
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
    // You might need to pass other globals as well (e.g., setTimeout, setInterval)
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  // eval(code);
  context.$plugins.forEach(function(plugin) {
    if (plugin.status) {
        files.push('./'+dirname+'/js/plugins/'+plugin.name + '.js');
    }
  }, this);
  files.push('./skeleton/js/main2.js');
}
const target = './bak/output.js';
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
async function appendFiles() {
  try {    
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      const replacedContent = content
      .replace(/(?<!var\s)(?<!')\$data(\w*)/g, "window['\$data$1']")
      .replace(/(?<!var\s)(?<!')\$game(\w*)/g, "window['\$game$1']")
      .replace(/(?<!var\s)(?<!')\$test(\w*)/g, "window['\$test$1']");

      fs.appendFileSync(target, `\n\n${replacedContent}`);
      if(file.includes(dirname)){
        fs.renameSync(file,'./bak/'+file);
      }      
    }
    console.log(`Appended all files to ${target}`);
  } catch (err) {
    console.error('Error appending files:', err);
  }
}
async function buildProj(){
genBakDir();
compressData();
await cleanFile();
await readPlugins();
await appendFiles();

// Step 1: Bundle and minify
esbuild.build({
  entryPoints: ['./bak/output.js'], // your entry file
  bundle: true,
  outfile: './bak/bundle.js',
  platform: 'browser', 
  minify:true,
  external:["fs","path","nw.gui"],
}).then(() => {
    // Step 2: Obfuscate
    const code = fs.readFileSync('./bak/bundle.js', 'utf8');
    const obfuscated = obfuscator.obfuscate(code, {
      compact: true,
      controlFlowFlattening: true,
      deadCodeInjection: true,
      stringArray: true,
      identifierNamesGenerator: "mangled",
      // stringArrayEncoding: ['base64'],
      stringArrayThreshold: 0.75,
  
    });
  
    fs.writeFileSync(''+dirname+'/dist/bundle.obfuscated.js', obfuscated.getObfuscatedCode());
    console.log('Bundled, minified, and obfuscated!');
});
}
buildProj();