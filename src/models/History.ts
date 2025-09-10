import mongoose, { Schema } from 'mongoose';
import { HistoryDocument } from '../types';

const HistorySchema = new Schema<HistoryDocument>({
  itemId: {
    type: String,
    required: true,
    index: true,
  },
  action: {
    type: String,
    required: true,
    enum: ['factor_updated', 'recalculation', 'webhook_triggered'],
  },
  oldValue: {
    type: Number,
  },
  newValue: {
    type: Number,
    required: true,
  },
  inputValue: {
    type: Number,
  },
  resultValue: {
    type: Number,
  },
  triggeredBy: {
    type: String,
    required: true,
    enum: ['api', 'webhook', 'system'],
  },
  metadata: {
    type: Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

// Indexes for efficient queries
HistorySchema.index({ itemId: 1, createdAt: -1 });
HistorySchema.index({ action: 1 });
HistorySchema.index({ triggeredBy: 1 });

// Virtual for JSON serialization
HistorySchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: unknown, ret: any) {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const History = mongoose.model<HistoryDocument>('History', HistorySchema);
