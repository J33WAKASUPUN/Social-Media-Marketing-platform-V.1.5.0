/* eslint-disable prettier/prettier */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type InvitationDocument = Invitation & Document;

@Schema({ timestamps: true })
export class Invitation {
  _id: Types.ObjectId;

  @Prop({ required: true })
  email: string;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ 
    type: String, 
    enum: ['admin', 'manager', 'member', 'viewer'], 
    required: true 
  })
  role: string;

  @Prop({ 
    type: String, 
    enum: ['pending', 'accepted', 'expired', 'cancelled'], 
    default: 'pending' 
  })
  status: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  invitedBy: Types.ObjectId;

  @Prop({ required: true, unique: true })
  token: string;

  @Prop({ required: true })
  expiresAt: Date;

  @Prop()
  message?: string;

  @Prop()
  acceptedAt?: Date;

  @Prop({ type: Types.ObjectId, ref: 'User' })
  acceptedBy?: Types.ObjectId;
}

export const InvitationSchema = SchemaFactory.createForClass(Invitation);

// Create indexes - only use schema.index, not @Prop({ index: true })
InvitationSchema.index({ email: 1, organizationId: 1 });
// InvitationSchema.index({ token: 1 }, { unique: true });
InvitationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
InvitationSchema.index({ status: 1 });