#!/usr/bin/env node

const Docky = require('../index.js');
const pkg = require('../package.json');
const Commander = require('commander');
const without = require('lodash/without');
const glob = require('glob');
const chokidar = require('chokidar');

const parseBool = (str) => (
    str ? str.toLowerCase() === 'true' : true
);

const parseList = (val) => (val.split(','));

const defaults = {
  useReadme: true,
  color: '#2E8CFF'
};

Commander
  .version(pkg.version)
  .arguments('[files...]')
  .option('-w, --watch <files>', 'Watch specific files and compile on change (comma separate directories/files to watch multiple)', parseList)
  .option('-i, --ignore <files>', 'Ignore specified files from docs', parseList)
  .option('-c, --color <color>', 'Specify a theme color (RGB or HEX)')
  .option('--use-readme [bool]', 'Include/omit README from your documentation (defaults to true)', parseBool)
  .action((files) => {
    if (!files || !files.length) {
      console.error('\nNo file(s) specified.\n'.red);
      process.exit(1);
    }

    const { useReadme, watch, ignore, color } = Commander;

    const options = Object.assign({}, defaults);

    if (typeof useReadme !== 'undefined') {
      options.useReadme = useReadme;
    }

    if (typeof color !== 'undefined') {
      options.color = color;
    }

    const ignoreFiles = ignore && ignore.length ?
      [].concat(...ignore.map(pattern => glob.sync(pattern))) :
      [];
      
    const validFiles = ignoreFiles.length ? without(files, ...ignoreFiles) : files;

    let filesToWatch = [];

    if (watch && watch.length) {
      filesToWatch = watch
          .map(pattern => glob.sync(pattern))
          .reduce((arr, val) => (arr.concat(val)), []);
    }

    Docky(validFiles, options);

    if (filesToWatch.length) {
      chokidar.watch(filesToWatch)
        .on('change', (p) => {
          console.log(p, 'changed');
          return Docky(validFiles, options);
        });
    }
  })
  .parse(process.argv);
