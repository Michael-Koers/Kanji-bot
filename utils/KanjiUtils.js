module.exports = class KanjiUtils {

    randomKanji(kanjis) {
        return kanjis[Math.floor(Math.random() * Math.floor(kanjis.length))];
    }
}