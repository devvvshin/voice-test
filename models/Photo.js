const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const photoSchema = new Schema({
  tags: Array,
  date: Date,
  display_src: String,
  thumbnail_src: String,
  meta: Object,
});

const Photo = mongoose.model('photos', photoSchema);

module.exports = Photo;
