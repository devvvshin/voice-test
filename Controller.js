const PhotoDAO = require('./PhotoDAO');
const OpenKoreanTextProcessor = require('open-korean-text-node').default;

const DEFALUT_DUMP_PATH = './dump.json'
class Controller {
  constructor(options) {
    this.photoDao = new PhotoDAO();
    this.options = options;
  }

  ready() {
    const { photoDao, options } = this;
    const { dumpFilePath } = options;
    return new Promise((resolve) => {
      photoDao.init(dumpFilePath || DEFALUT_DUMP_PATH).then(() => {
        OpenKoreanTextProcessor.ensureJvm().then(() => resolve());
      });
    })
  }

  tokenizeText(text) {
    const token = OpenKoreanTextProcessor.tokenizeSync(text);
    return {
      tokens: token.stemSync().toJSON(),
      pharses: token.extractPhrasesSync()
    };
  }

  getPhotosByText(text) {
    const { photoDao } = this;

    /* noun, alpha, josa, verb */
    const meaningTargets = ['Noun', 'Alpha', 'Josa', 'Verb', 'Number', 'Foreign'];
    const whenCommonWords = [
      { word :'이전', type: 'Noun', value: -1 },
      { word :'이번', type: 'Noun', value: 0 },
      { word :'다음', type: 'Noun', value: 1 },
    ]
    const skipWords = ["사진", "보여주다"];
    const getYearDate = () => new Date(`${(new Date()).getFullYear()}/1/1`);
    const morpheres = this.tokenizeText(text);
    const tokens = morpheres.tokens.reduce((res, m) => {
      if(meaningTargets.find((meaning) => meaning == m.pos) && !skipWords.find((w) => w == m.text))
      res.push(m)

      return res;
    }, []);

    // when => or | and
    //when
    const when = tokens.reduce((when, token, i) => {
      const { text, pos, offset, length } = token;
      const genBaseForm = () => {
        const now = new Date()
        return {
          start: {
            year: now.getFullYear(),
            month: 1,
            date: 1,
          },
          end: {
            year: now.getFullYear(),
            month: 12,
            date: 31,
          }
        }
      }

      if(pos == 'Number') {

        //year
        if(text.lastIndexOf('년')) {
          const yearValue = parseInt(text);

          if(yearValue != NaN) {
            if(!when) when = genBaseForm();

            //Foreign
            if(i + 1 < tokens.length - 1 ) {
              const checkPriorWord = tokens[i + 1];
              if(checkPriorWord.pos == 'Foreign' && checkPriorWord.text == '전') {
                when.start.year -= yearValue;
                when.end.year -= yearValue;
              }
              tokens.splice(i + 1, 1);
            } else {
              when.start.year = yearValue;
              when.end.year = yearValue;
            }
            tokens.splice(i, 1);
          }
        }
      }

      //compounded year word
      const compoundedYearWords = [
        { word: '작년', value: -1 },
        { word: '전년', value: -1 },
        { word: '올해', value: 0 }
      ];

      const compoundedYearWord = compoundedYearWords.find((y) => y.word == text);
      if(compoundedYearWord) {
        if(!when) when = genBaseForm();
        when.start.year += compoundedYearWord.value;
        when.end.year += compoundedYearWord.value;
        tokens.splice(i, 1);
      }

      return when;
    }, null);

    const tags = tokens.filter(({ pos }) => ((pos == 'Noun') || (pos == 'Alpha')));

    let dateQuery = null;
    let tagsQuery = null;

    if(when) {
      const { start, end } = when;
      dateQuery = {
        date : {
          $gte: new Date(start.year, start.month - 1, start.date),
          $lte: new Date(end.year, end.month - 1, end.date)
        }
      }
    }
    if(tags && tags.length > 0) {
      tagsQuery = tags.map((tag) => {
        return {
          tags: tag.text
        }
      });
    }

    const query = {    }

    if(tagsQuery) {
      query['$or'] = [tagsQuery].reduce((tags, q) => {
        if(q)
        tags.push(...q);
        return tags;
      }, [])
    }
    if(dateQuery) {
      query['$and'] = [dateQuery];
    }
    console.log(query['$and'])
    console.log(query['$or'])

    return new Promise((resolve) => {
      photoDao.find(query).then((docs) => {
        resolve(docs);
      })
    })
  }
}

module.exports = Controller;
