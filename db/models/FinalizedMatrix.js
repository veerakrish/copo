const mongoose = require('mongoose');

const finalizedMatrixSchema = new mongoose.Schema({
  courseName: {
    type: String,
    required: true,
  },
  articulationData: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  }
});

const FinalizedMatrix = mongoose.model('FinalizedMatrix', finalizedMatrixSchema);

module.exports = FinalizedMatrix;
