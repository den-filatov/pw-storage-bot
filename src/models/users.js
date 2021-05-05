const mongoose = require("mongoose");

const schema = mongoose.Schema({
  user_id: String,
  first_name: String,
  last_name: String,
  username: String,
  is_bot: Boolean,
  global_password: String,
  services: { type: Map, of: String },
});

module.exports = mongoose.model("User", schema);
