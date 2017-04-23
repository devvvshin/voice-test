const fs = require('fs');
const mongoose = require('mongoose');
const { Photo, History } = require('./models')
const COLLECTIONS = ['photos'];

class PhotoDAO {
  constructor() {

  }

  init(dumpFilePath) {
    return new Promise((resolve) => {

      mongoose.connect('mongodb://localhost/insta', () => {
        mongoose.connection.db.dropDatabase();
        mongoose.connect('mongodb://localhost/insta', () => {

          const instaData = JSON.parse(fs.readFileSync(dumpFilePath,'utf-8'));

          const insertsPromise = new Promise((resolve) => {
            let completeCount = instaData.length;
            instaData.forEach((doc) => {
              const photo = new Photo(doc)
              photo.save(() => {
                completeCount--;
                if(completeCount <= 0)
                  resolve();
              });
            });
          });

          insertsPromise.then(() => resolve());
        });
      })
    });
  }

  find(query) {
    return this._find(query);
  }

  findByDate(startDate, endDate) {
    return this._find({date: {$gte: startDate, $lte: endDate}});
  }

  findByTag(tag) {
    return this._find({tags: tag});
  }

  _find(query) {
    return new Promise((resolve) => {
      Photo.find(query, (err, docs) => {
        if(err) {
          console.log("=============== err ===============");
          console.log(query);
          console.log(err);
        }

        resolve(docs);
      })
    });
  }
}

module.exports = PhotoDAO;


// const startDate = new Date(2014, 3, 1);
// const endDate = new Date(2014, 3, 30);
//
// Photo.find({date: {$gte: startDate, $lt: endDate}}, (err, docs) => {
//   const tags = docs.reduce((tags, doc) => {
//     const tags_ = doc.tags;
//
//     tags_.forEach((tag_) => {
//       const tag = tags.find((t) => t.tag == tag_);
//       if(tag)tag.count++
//       else tags.push({
//             tag: tag_,
//             count: 1
//           })
//     });
//
//     return tags;
//   }, []).sort((t1, t2) => (t1.count < t2.count) ? 1 : -1)
//
//   console.log(tags);
// });
//
// Photo.find({tags:"필라테스"}, (err, docs) => {
//   docs.forEach((doc) => {
//     console.log(doc.tags);
//     console.log(doc.date + "========================");
//   })
//   console.log(docs.length)
//
//   const history = new History({
//     photos: docs
//   });
//
//   history.save();
// })
