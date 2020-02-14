const axios = require('axios');

module.exports = class KanjiApi {


    constructor(kanji_url, token) {
        this.kanji_url = kanji_url
        this.token = token
    }

    getKanjiInformation(kanji) {
        return new Promise((resolve, reject) => {
            axios.get(`${this.kanji_url}/${encodeURI(kanji)}`,
                {
                    headers: {
                        "x-rapidapi-host": "kanjialive-api.p.rapidapi.com",
                        "x-rapidapi-key": this.token
                    }
                }
            ).then((res) => {
                resolve(res.data);
            }).catch((err) => {
                LOGGER.warn("Axios error:", err);
                reject(err);
            });
        })
    }
}