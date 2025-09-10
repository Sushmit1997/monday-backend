import mongoose, { Schema } from 'mongoose';
import { FactorDocument } from '../types';

const FactorSchema = new Schema<FactorDocument>({
  itemId: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  factor: {
    type: Number,
    required: true,
    min: 0,
    default: 1,
  },
}, {
  timestamps: true,
});

// Virtual for JSON serialization
FactorSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc: unknown, ret: any) {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

export const Factor = mongoose.model<FactorDocument>('Factor', FactorSchema);
