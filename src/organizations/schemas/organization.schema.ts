/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type OrganizationDocument = Organization & Document;

@Schema({ timestamps: true })
export class Organization {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  name: string;

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop()
  description?: string;

  @Prop()
  logo?: string;

  @Prop({ 
    type: String, 
    enum: ['active', 'inactive', 'suspended'], 
    default: 'active'
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  ownerId: Types.ObjectId;

  @Prop({
    type: {
      timezone: { type: String, default: 'UTC' },
      dateFormat: { type: String, default: 'MM/DD/YYYY' },
      language: { type: String, default: 'en' },
      currency: { type: String, default: 'USD' },
      features: {
        analytics: { type: Boolean, default: true },
        scheduling: { type: Boolean, default: true },
        teamCollaboration: { type: Boolean, default: true },
        customBranding: { type: Boolean, default: false },
        apiAccess: { type: Boolean, default: false },
      },
      limits: {
        maxBrands: { type: Number, default: 5 },
        maxUsers: { type: Number, default: 10 },
        maxPostsPerMonth: { type: Number, default: 1000 },
        maxSocialAccounts: { type: Number, default: 25 },
      }
    },
    default: () => ({})
  })
  settings: {
    timezone: string;
    dateFormat: string;
    language: string;
    currency: string;
    features: {
      analytics: boolean;
      scheduling: boolean;
      teamCollaboration: boolean;
      customBranding: boolean;
      apiAccess: boolean;
    };
    limits: {
      maxBrands: number;
      maxUsers: number;
      maxPostsPerMonth: number;
      maxSocialAccounts: number;
    };
  };

  @Prop({
    type: {
      planId: { type: String, required: true },
      planName: { type: String, required: true },
      status: { type: String, enum: ['active', 'inactive', 'cancelled', 'past_due'], default: 'active' },
      startDate: { type: Date, default: Date.now },
      endDate: { type: Date },
      billingCycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
      amount: { type: Number, required: true },
      currency: { type: String, default: 'USD' },
      autoRenew: { type: Boolean, default: true },
      trialEndsAt: { type: Date },
      metadata: { type: Object, default: {} }
    },
    required: true
  })
  subscription: {
    planId: string;
    planName: string;
    status: string;
    startDate: Date;
    endDate?: Date;
    billingCycle: string;
    amount: number;
    currency: string;
    autoRenew: boolean;
    trialEndsAt?: Date;
    metadata: Record<string, any>;
  };

  @Prop({
    type: [{
      action: { type: String, required: true },
      userId: { type: Types.ObjectId, ref: 'User', required: true },
      timestamp: { type: Date, default: Date.now },
      metadata: { type: Object, default: {} }
    }],
    default: []
  })
  auditLog: Array<{
    action: string;
    userId: Types.ObjectId;
    timestamp: Date;
    metadata: Record<string, any>;
  }>;
}

export const OrganizationSchema = SchemaFactory.createForClass(Organization);

// Only define indexes once - remove duplicates
OrganizationSchema.index({ ownerId: 1 });
OrganizationSchema.index({ status: 1 });