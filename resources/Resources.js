const fs = require('fs');
const CryptoJS = require('crypto-js');

// Path from the index.js to this class
const PATH_INDEX_TO_RESOURCES = "./resources"

module.exports = class ResourcesManager {

    constructor() {

        // Paths needs to be relative from the index.js
        this.kanji_location = `${PATH_INDEX_TO_RESOURCES}/kanji_data`;
        this.kanji_gif_strokes_location = `${PATH_INDEX_TO_RESOURCES}/kanji_strokes/out`;
        this.settings_location = `${PATH_INDEX_TO_RESOURCES}/settings/persisted_settings.json`;
        this.auth_location = `${PATH_INDEX_TO_RESOURCES}/settings/token.json`;
        this.passphrase = `${PATH_INDEX_TO_RESOURCES}/settings/passphrase`;

    };

    loadSettings() {
        // Load all guild settings into memory
        return new Promise((resolve, reject) => {
            fs.readFile(this.settings_location, (err, data) => {
                if (err || data.length == 0) { reject(err); return; }
                resolve(JSON.parse(data));
            })
        });
    }

    saveSettings(guild_settings = {}) {
        // Save all guild settings to JSON file
        return new Promise((resolve, reject) => {
            fs.writeFile(this.settings_location, JSON.stringify(guild_settings), (err) => {
                if (err) { reject(err); return; }
                resolve();
            });
        })
    }

    loadKanjiGrade(i) {
        // Load kanjis from kanji grade file in resources 
        return new Promise((resolve, reject) => {
            fs.readFile(`${this.kanji_location}/${i}.json`, (err, data) => {
                if (err || data.length == 0) { reject(err); return; }
                resolve(JSON.parse(data));
            });
        });
    }

    getKanjiStrokeOrderGif(k) {
        // Get kanji gif
        return `${this.kanji_gif_strokes_location}/${k.charCodeAt(0)}.gif`;
    }

    loadAuth() {
        // Load encrypted tokens from token file and decrypt using secret passphrase
        // This can not be done in a promise because the tokens have to be loaded before the bot can login to Discord
        let data = fs.readFileSync(this.auth_location);

        let passphrase = fs.readFileSync(this.passphrase).toString();
        let tokens = JSON.parse(data);

        // Overwrite encrypted tokens with decrypted tokens
        for (let token in tokens) {
            tokens[token] = CryptoJS.AES.decrypt(tokens[token], passphrase).toString(CryptoJS.enc.Utf8);
        }
        return tokens;
    }
}