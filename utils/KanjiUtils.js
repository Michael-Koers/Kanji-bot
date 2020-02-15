module.exports = class KanjiUtils {

    randomKanji(kanjis) {
        return kanjis[Math.floor(Math.random() * Math.floor(kanjis.length))];
    }

    isValidGrade(grade){
        return (grade > 0 && grade <= 6 && !isNaN(grade))
    }
}