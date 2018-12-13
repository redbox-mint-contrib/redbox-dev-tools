let request = require('request');
let fs = require('fs');
let fsextra = require('fs-extra');
let process = require('process');
let downloadRelease = require('download-github-release');
let mustache = require('mustache');
let inly = require('inly');

class InitProject {

    getHelp() {
        const sections = [
            {
              header: 'ReDBox Dev Tools - Init Hook',
              content: 'Initialises a hook project for use with ReDBox'
            },
            {
              header: 'Usage',
              content: '$ redbox-dev-tools init -p redbox-hook-name'
            },
            {
              header: 'Available Flags',
              optionList: [
                {
                  name: 'packageName',
                  alias: 'p',
                  typeLabel: '{underline name}',
                  required: true,
                  description: 'The NPM package name for the sails hook.'
                }
              ]
            }
          ]
        return sections;
    }
    execute(options) {
        this.repo = 'redbox-hook-template';
        this.downloadProjectTemplate(options);
    }

    setPackageJson(options) {
        let template = fs.readFileSync(options.packageName+"/package.json.mst", 'utf8')
        let output = mustache.render(template, options);
        fs.writeFileSync(options.packageName+'/package.json', output);
    }

    setIndexJs(options) {
        let template = fs.readFileSync(options.packageName+"/index.js.mst", 'utf8')
        let output = mustache.render(template, options);
        fs.writeFileSync(options.packageName+"/index.js", output);
    }

    setDockerCompose(options) {
        let template = fs.readFileSync(options.packageName+"/support/development/docker-compose.yml.mst", 'utf8')
        let output = mustache.render(template, options);
        fs.writeFileSync(options.packageName+"/support/development/docker-compose.yml", output);
    }

    filterRelease(release) {
        return release.prerelease === false;
    }

    filterAsset(asset) {
        return asset.name.indexOf('tgz') >= 0;;
    }

    extractTgz(options) {
        let regex = `redboxresearchdata\-${this.repo}.*\.tgz`;
        let re = new RegExp(regex,"g");
        this.tgzFilename = "";
        fs.mkdirSync(options.packageName);
        fs.readdirSync(".").forEach(file => {
            if(file.match(re)) {
                this.tgzFilename = file;
            }
          })

        let extract = inly(this.tgzFilename, options.packageName);
        
        extract.on('error', (error) => {
            console.error(error);
        });

        let that = this;
        extract.on('end', () => {
            console.log("Initialising project");
            //TODO: Find moustache templates and evaluate them rather than specifying each one
            that.setPackageJson(options);
            that.setIndexJs(options);
            that.setDockerCompose(options);
            that.tidyUp(options);
            console.log("Initialisation complete.");
        });
    }

   
    tidyUp(options) {
        fsextra.removeSync(this.tgzFilename);
        fsextra.removeSync(options.packageName+"/index.js.mst");
        fsextra.removeSync(options.packageName+"/package.json.mst");
        fsextra.removeSync(options.packageName+"/support/development/docker-compose.yml.mst");
    }

    downloadProjectTemplate(options) {
        let user = 'redbox-mint-contrib';
        
        let outputDir = ".";
        let leaveZipped = false;

        if (fs.existsSync(options.packageName)) {
            //TODO: Improve the error message
            console.error("Dir already exists");
            process.exit(1);
        }

        let that = this;
        downloadRelease(user, this.repo, outputDir, this.filterRelease, this.filterAsset, leaveZipped)
            .then(function () {
                that.extractTgz(options);
            })
            .catch(function (err) {
                console.error(err.message);
            });
    }


}

module.exports = InitProject;
