/* eslint-disable prettier/prettier */
 
// src/users/schemas/user.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  _id: Types.ObjectId;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false, select: false })
  password?: string;

  @Prop({ required: true })
  name: string;

  @Prop()
  avatar?: string;

  @Prop({ 
    type: String, 
    enum: ['active', 'inactive', 'suspended'], 
    default: 'active' 
  })
  status: string;

  @Prop({ default: false })
  emailVerified: boolean;

  @Prop({
    type: {
      timezone: { type: String, default: 'UTC' },
      language: { type: String, default: 'en' },
      theme: { type: String, enum: ['light', 'dark'], default: 'light' },
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        postSuccess: { type: Boolean, default: true },
        postFailure: { type: Boolean, default: true },
      }
    },
    default: () => ({})
  })
  preferences: {
    timezone: string;
    language: string;
    theme: string;
    notifications: {
      email: boolean;
      push: boolean;
      postSuccess: boolean;
      postFailure: boolean;
    };
  };

  @Prop([{
    provider: { type: String, required: true },
    providerId: { type: String, required: true },
    email: { type: String },
    name: { type: String },
    avatar: { type: String },
    accessToken: { type: String, select: false },
    refreshToken: { type: String, select: false },
    connectedAt: { type: Date, default: Date.now }
  }])
  socialAccounts: Array<{
    provider: string;
    providerId: string;
    email?: string;
    name?: string;
    avatar?: string;
    accessToken?: string;
    refreshToken?: string;
    connectedAt: Date;
  }>;

  @Prop()
  lastLoginAt?: Date;

  @Prop()
  refreshToken?: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Create indexes - ONLY these, no duplicates
// Note: email is already unique in @Prop, so we don't need to add it again
UserSchema.index({ 'socialAccounts.provider': 1, 'socialAccounts.providerId': 1 });