const Generator = require('yeoman-generator');
const { gray, red, yellow } = require('chalk').default;
const yosay = require('yosay');
const { join } = require('path');
const validate = require('validate-npm-package-name');

const SEQUELIZE_DIALECT = require('./utils/sequelize-dialect-enum');

module.exports = class extends Generator {
  async prompting() {
    this.log(yosay(`Welcome to the ${red('generator-exprest-api')} generator!`));

    this.answers = await this.prompt([
      {
        type: 'input',
        name: 'shortname',
        message: `Package ${yellow('shortname')} [ex: ${gray('rest-api')}]`,
        validate: input => validate(input).validForNewPackages || 'Must be a valid package name',
      },
      {
        type: 'input',
        name: 'name',
        message: `App ${yellow('(pretty) name')} [ex: ${gray('My REST API')}]`,
        validate: input => input.trim() !== '',
      },
      {
        type: 'input',
        name: 'description',
        message: `App ${yellow('description')} [ex: ${gray('A REST API for cats and dogs')}]`,
        validate: input => input.trim() !== '',
      },
      {
        type: 'confirm',
        name: 'sequelize',
        message: `Use ${yellow.bold('Sequelize')} as ORM ?`,
        default: true,
      },
      {
        type: 'list',
        name: 'sequelizeDialect',
        message: `What is your database ${yellow.bold('dialect')} ?`,
        choices: Object.values(SEQUELIZE_DIALECT),
        when: ({ sequelize }) => {
          // Only run if user set Sequelize
          return !!sequelize;
        },
      },
      {
        type: 'confirm',
        name: 'winston',
        message: `Use ${yellow.bold('winston')} for logging ?`,
        default: true,
      },
      {
        type: 'confirm',
        name: 'celebrate',
        message: `Use ${yellow.bold('celebrate/joi')} for object validation ?`,
        default: true,
      },
      {
        type: 'confirm',
        name: 'axios',
        message: `Use ${yellow.bold('axios')} for HTTP requests ?`,
        default: true,
      },
      {
        type: 'confirm',
        name: 'prettier',
        message: `Use ${yellow.bold('Prettier')} for code formatting ?`,
        default: true,
      },
      {
        type: 'confirm',
        name: 'docker',
        message: `Generate a ${yellow('DockerFile')} ?`,
        default: true,
      },
      {
        type: 'confirm',
        name: 'openapi',
        message: `Generate an ${yellow.bold('OpenAPI')} documentation file ?`,
        default: true,
      },
    ]);
  }

  writing() {
    const { answers } = this;
    const { shortname } = answers;
    const copy = this.fs.copy.bind(this.fs);
    const copyTpl = this.fs.copyTpl.bind(this.fs);
    const src = this.templatePath.bind(this);
    const dest = this.destinationPath.bind(this);
    const extendJSON = this.fs.extendJSON.bind(this.fs);
    const pkgJson = {
      devDependencies: {},
      dependencies: {},
    };

    const dialect = Object.values(SEQUELIZE_DIALECT).find(d => d.value === answers.sequelizeDialect);

    copy(src('editorconfig'), dest(`${shortname}/.editorconfig`));
    copy(src('gitattributes'), dest(`${shortname}/.gitattributes`));
    copy(src('gitignore'), dest(`${shortname}/.gitignore`));
    copy(src('.env.example'), dest(`${shortname}/.env.example`));

    copy(src('src/services/empty'), dest(`${shortname}/src/services/empty`));
    copy(src('src/utils/empty'), dest(`${shortname}/src/utils/empty`));

    copyTpl(src('eslintrc'), dest(`${shortname}/.eslintrc.json`), answers);
    copyTpl(src('README.md'), dest(`${shortname}/README.md`), answers);
    copyTpl(src('CONTRIBUTING.md'), dest(`${shortname}/CONTRIBUTING.md`), {
      ...answers,
      sequelizeDialect: dialect.name,
    });
    copyTpl(src('_package'), dest(`${shortname}/package.json`), answers);
    copyTpl(src('index'), dest(`${shortname}/index.js`), answers);
    copyTpl(src('src/config/index'), dest(`${shortname}/src/config/index.js`), answers);
    copyTpl(src('src/routes/index.js'), dest(`${shortname}/src/routes/index.js`), answers);

    if (answers.sequelize) {
      copy(src('src/models/index.js'), dest(`${shortname}/src/models/index.js`));
      copyTpl(src('src/config/sequelize'), dest(`${shortname}/src/config/sequelize.js`), {
        sequelizeDialect: dialect.value,
      });

      pkgJson.dependencies.sequelize = '^4.43.0';
      pkgJson.dependencies = Object.assign(pkgJson.dependencies, ...dialect.packages);
    }

    if (answers.winston) {
      copy(src('src/config/winston.js'), dest(`${shortname}/src/config/winston.js`));

      pkgJson.dependencies.winston = '^3.2.1';
    }

    if (answers.celebrate) {
      pkgJson.dependencies.celebrate = '^9.1.0';
    }

    if (answers.axios) {
      pkgJson.dependencies.axios = '^0.18.0';
    }

    if (answers.prettier) {
      copy(src('prettierrc'), dest(`${shortname}/.prettierrc`));

      pkgJson.devDependencies['eslint-config-prettier'] = '^4.1.0';
      pkgJson.devDependencies['eslint-plugin-prettier'] = '^3.0.1';
      pkgJson.devDependencies.prettier = '^1.16.4';
    }

    if (answers.docker) {
      copyTpl(src('DockerFile'), dest(`${shortname}/DockerFile`), answers);
    }

    if (answers.openapi) {
      copyTpl(src('doc/index.html'), dest(`${shortname}/doc/index.html`), answers);
      copyTpl(src('doc/openapi.yaml'), dest(`${shortname}/doc/openapi.yaml`), answers);
    }

    extendJSON(dest(`${shortname}/package.json`), pkgJson);
  }

  install() {
    const { shortname } = this.answers;

    const appDir = join(process.cwd(), shortname);

    process.chdir(appDir);

    this.installDependencies({ bower: false, npm: true })
      .then(() => this.spawnCommandSync('npm', ['remove', '-S', 'example']))
      .then(() => this.spawnCommandSync('npm', ['remove', '-D', 'example']))
      .then(() => this.spawnCommandSync('npm', ['update']))
      .then(() => this.spawnCommandSync('npm', ['run', 'lint:fix']));
  }

  end() {
    this.log(yosay(`All done ! \n\nStart a development server by running ${yellow('npm run dev')}.`));
  }
};
