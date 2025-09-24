/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type MembershipDocument = Membership & Document;

// Export the function so it can be used in service
export function getDefaultPermissions(role: string) {
  const permissions = {
    owner: {
      organizations: { create: true, read: true, update: true, delete: true },
      members: { invite: true, manage: true, remove: true },
      brands: { create: true, manage: true, delete: true },
      settings: { view: true, manage: true }
    },
    admin: {
      organizations: { create: false, read: true, update: true, delete: false },
      members: { invite: true, manage: true, remove: true },
      brands: { create: true, manage: true, delete: true },
      settings: { view: true, manage: true }
    },
    manager: {
      organizations: { create: false, read: true, update: false, delete: false },
      members: { invite: true, manage: false, remove: false },
      brands: { create: true, manage: true, delete: false },
      settings: { view: true, manage: false }
    },
    member: {
      organizations: { create: false, read: true, update: false, delete: false },
      members: { invite: false, manage: false, remove: false },
      brands: { create: false, manage: false, delete: false },
      settings: { view: true, manage: false }
    },
    viewer: {
      organizations: { create: false, read: true, update: false, delete: false },
      members: { invite: false, manage: false, remove: false },
      brands: { create: false, manage: false, delete: false },
      settings: { view: true, manage: false }
    }
  };

  return permissions[role] || permissions.viewer;
}

@Schema({ timestamps: true })
export class Membership {
  _id: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: 'Organization', required: true })
  organizationId: Types.ObjectId;

  @Prop({ 
    type: String, 
    enum: ['owner', 'admin', 'manager', 'member', 'viewer'], 
    required: true 
  })
  role: string;

  @Prop({ 
    type: String, 
    enum: ['active', 'inactive', 'pending', 'suspended'], 
    default: 'active' 
  })
  status: string;

  @Prop({
    type: {
      organizations: {
        create: { type: Boolean, default: false },
        read: { type: Boolean, default: true },
        update: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
      members: {
        invite: { type: Boolean, default: false },
        manage: { type: Boolean, default: false },
        remove: { type: Boolean, default: false },
      },
      brands: {
        create: { type: Boolean, default: false },
        manage: { type: Boolean, default: false },
        delete: { type: Boolean, default: false },
      },
      settings: {
        view: { type: Boolean, default: false },
        manage: { type: Boolean, default: false },
      }
    },
    default: function() {
      return getDefaultPermissions(this.role);
    }
  })
  permissions: {
    organizations: {
      create: boolean;
      read: boolean;
      update: boolean;
      delete: boolean;
    };
    members: {
      invite: boolean;
      manage: boolean;
      remove: boolean;
    };
    brands: {
      create: boolean;
      manage: boolean;
      delete: boolean;
    };
    settings: {
      view: boolean;
      manage: boolean;
    };
  };

  @Prop()
  invitedBy?: Types.ObjectId;

  @Prop()
  invitedAt?: Date;

  @Prop()
  joinedAt?: Date;

  @Prop()
  lastAccessAt?: Date;
}

export const MembershipSchema = SchemaFactory.createForClass(Membership);

// Add method to get default permissions based on role
MembershipSchema.methods.getDefaultPermissions = function(role: string) {
  return getDefaultPermissions(role);
};

// Add pre-save hook to ensure permissions are set correctly
MembershipSchema.pre('save', function(next) {
  if (this.isModified('role') || this.isNew) {
    this.permissions = getDefaultPermissions(this.role);
  }
  next();
});

// Create indexes - remove duplicates
MembershipSchema.index({ userId: 1, organizationId: 1 }, { unique: true });
MembershipSchema.index({ organizationId: 1 });
MembershipSchema.index({ userId: 1 });
MembershipSchema.index({ role: 1 });
MembershipSchema.index({ status: 1 });