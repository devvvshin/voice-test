const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const historySchema = new Schema({
  date: { type: Date, default: new Date()},
  photos: Array,
  query: Object,
  queryText: String,
  morphemes: Array,
});

const History = mongoose.model('histories', historySchema);
module.exports = History;
