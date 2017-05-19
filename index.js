const dockyPkg = require('./package.json');
const docgen = require('react-docgen');
const _ = require('lodash');
const fs = require('fs-extra');
const path = require('path');
const pug = require('pug');
const del = require('del');
const Promise = require('promised-io/promise');
const FS = require('promised-io/fs');

require('colors');

const cwd = process.cwd();
const dockyPath = path.resolve(__dirname);
const pkg = JSON.parse(fs.readFileSync(`${cwd}/package.json`));

/**
 * Custom debug logger
 * @method log
 */
const log = (...args) => {
  console.log(`[Docky v${dockyPkg.version}]`.green, ...args);
};

/**
 * Checks if a folder exists
 * @method folderExists
 * @param  {String} folder
 * @param  {Function} cb(exists) - callback where exists is a boolean
 */
function folderExists(folder) {
  try {
    return fs.statSync(`${cwd}/${folder}`).isDirectory();
  } catch (err) {
    return false;
  }
}

/**
 * Checks if a file exists and is not a directory
 * @method fileExists
 * @param  {String} file
 * @param  {Function} cb - callback
 */
function fileExists(file) {
  try {
    return fs.statSync(`${cwd}/${file}`).isFile();
  } catch (err) {
    return false;
  }
}

/**
 * Copies template assets to docs folder
 * @method copyAssets
 */
function copyAssets() {
  log('Copying documentation assets');

  return Promise.all([
    fs.copy(`${dockyPath}/template/css`, 'docs/css'),
    fs.copy(`${dockyPath}/template/images`, 'docs/images'),
    fs.copy(`${dockyPath}/template/js`, 'docs/js'),
  ]);
}

/**
 * Cleans the docs folder
 * @method cleanDocsFolder
 * @return {Promise}
 */
function cleanDocsFolder() {
  log('Cleaning Docs folder');
  return del([
    'docs/css',
    'docs/js',
    'docs/index.html'
  ]);
}


/**
 * Writes the template file to /docs
 * @method writeTemplateFile
 */
function writeTemplateFile(html) {
  log('Writing template file');

  return FS.writeFile(`${cwd}/docs/index.html`, html, 'utf8');
}

/**
 * Creates the docs folder
 * @method createDocs
 * @param {String} template
 */
function createDocs(html) {
  log('Creating Docs');

  if (folderExists('docs')) {
    cleanDocsFolder()
      .then(() => writeTemplateFile(html))
      .then(copyAssets)
      .then(() => {
        log('\u2713'.green, 'Docs successfully generated');
        console.log('\n Type \'open docs/index.html\' to view them');
      });
  } else {
    log('Creating docs folder');

    fs.mkdir(`${cwd}/docs`, err => {
      if (err) throw err;

      writeTemplateFile(html)
        .then(copyAssets)
        .then(() => {
          log('\u2713'.green, 'Docs successfully generated');
          console.log('\n Type \'open docs/index.html\' to view them');
        });
    });
  }
}

const getComponentName = (filename) => (
  filename.replace(/^(.*)\/(\w+)(.jsx?)$/g, '$2')
);

const parseReadme = (readme) => {
  const structure = {};
  const parts = readme.split(/\n##\s(.+)\b/g);

  structure['Introduction'] = parts.shift();

  parts.forEach((part, i) => {
    if (i % 2 === 0) structure[part] = parts[i + 1];
  });

  return structure;
};

const run = (files, options = {}) => {
  let docs;
  let props;

  const components = files.map(file => {
    docs = docgen.parse(fs.readFileSync(file, 'utf8'));
    props = [];

    if (docs.props) {
      props = Object.keys(docs.props)
        .map(prop => (Object.assign(docs.props[prop], {
          name: prop,
          type: docs.props[prop].type.name,
          defaultValue: docs.props[prop].defaultValue ?
            docs.props[prop].defaultValue.value : undefined
        })));
    }

    return Object.assign(docs, {
      name: getComponentName(file),
      props: _.sortBy(props, 'name')
    });
  });

  const data = {
    package: pkg,
    components: _.sortBy(components, 'name'),
    pretty: true,
    markdown: require('marked'),
    capitalize: _.capitalize,
    kebabCase: _.kebabCase,
    color: options.color
  };

  const readmeExists = fileExists('./README.md');
  const useReadme = options.useReadme && readmeExists;

  if (!readmeExists) {
    log('No README found, continuing without');
  }

  data.readmeParts = useReadme ? parseReadme(data.readme) : [];

  if (useReadme) {
    data.readme = fs.readFileSync('./README.md', 'utf8');
  }

  pug.renderFile(`${dockyPath}/template/template.pug`, data, (renderErr, html) => {
    if (renderErr) throw renderErr;

    createDocs(html);
  });
};

/**
 * docky.js
 * @param  {String} file - the file to parse
 * @param  {Object} options - additonal options
 */
module.exports = (files, options = {}) => run(files, options);
