/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invitation, InvitationDocument } from '../schemas/invitation.schema';
import { Organization, OrganizationDocument } from '../schemas/organization.schema';
import { Membership, MembershipDocument } from '../schemas/membership.schema';
import { EmailService } from '../../email/email.service';
import { UsersService } from '../../users/users.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class InvitationsService {
  constructor(
    @InjectModel(Invitation.name) private invitationModel: Model<InvitationDocument>,
    @InjectModel(Organization.name) private organizationModel: Model<OrganizationDocument>,
    @InjectModel(Membership.name) private membershipModel: Model<MembershipDocument>,
    private emailService: EmailService,
    private usersService: UsersService,
  ) {}

  async createInvitation(
    organizationId: string,
    email: string,
    role: string,
    invitedBy: Types.ObjectId,
    message?: string
  ): Promise<InvitationDocument> {
    const organization = await this.organizationModel.findOne({
      _id: organizationId,
      isDeleted: false
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user is already a member
    const existingMembership = await this.membershipModel.findOne({
      organizationId: organization._id,
    }).populate('userId', 'email');

    if (existingMembership && (existingMembership.userId as any).email === email) {
      throw new ConflictException('User is already a member of this organization');
    }

    // Check if there's already a pending invitation
    const existingInvitation = await this.invitationModel.findOne({
      email,
      organizationId: organization._id,
      status: 'pending'
    });

    if (existingInvitation) {
      throw new ConflictException('A pending invitation already exists for this email');
    }

    // Check organization limits
    const currentMemberCount = await this.membershipModel.countDocuments({
      organizationId: organization._id,
      status: 'active'
    });

    const pendingInvitationCount = await this.invitationModel.countDocuments({
      organizationId: organization._id,
      status: 'pending'
    });

    if (currentMemberCount + pendingInvitationCount >= organization.settings.limits.maxUsers) {
      throw new BadRequestException('Organization has reached maximum user limit');
    }

    // Create invitation
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    const invitation = new this.invitationModel({
      email,
      organizationId: organization._id,
      role,
      invitedBy,
      token,
      expiresAt,
      message,
      status: 'pending'
    });

    const savedInvitation = await invitation.save();

    // Send invitation email
    const inviter = await this.usersService.findById(invitedBy.toString());
    await this.emailService.sendOrganizationInvitation(
      email,
      organization.name,
      inviter.name,
      token,
      role,
      message
    );

    return savedInvitation;
  }

  async acceptInvitation(token: string, userId: Types.ObjectId): Promise<MembershipDocument> {
    const invitation = await this.invitationModel.findOne({
      token,
      status: 'pending'
    }).populate('organizationId');

    if (!invitation) {
      throw new NotFoundException('Invitation not found or already processed');
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired';
      await invitation.save();
      throw new BadRequestException('Invitation has expired');
    }

    const user = await this.usersService.findById(userId.toString());
    if (user.email !== invitation.email) {
      throw new BadRequestException('This invitation was sent to a different email address');
    }

    const organization = invitation.organizationId as unknown as OrganizationDocument;

    // Check if user is already a member
    const existingMembership = await this.membershipModel.findOne({
      userId,
      organizationId: organization._id
    });

    if (existingMembership) {
      throw new ConflictException('You are already a member of this organization');
    }

    // Create membership
    const membership = new this.membershipModel({
      userId,
      organizationId: organization._id,
      role: invitation.role,
      status: 'active',
      acceptedAt: new Date(),
      lastAccessAt: new Date()
    });

    const savedMembership = await membership.save();

    // Update invitation status
    invitation.status = 'accepted';
    invitation.acceptedAt = new Date();
    invitation.acceptedBy = userId;
    await invitation.save();

    // Send welcome email
    await this.emailService.sendWelcomeEmail(
      user.email,
      user.name,
      organization.name
    );

    return savedMembership;
  }

  async getInvitationByToken(token: string): Promise<InvitationDocument> {
    const invitation = await this.invitationModel.findOne({
      token,
      status: 'pending'
    }).populate('organizationId', 'name description logo');

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    if (invitation.expiresAt < new Date()) {
      invitation.status = 'expired';
      await invitation.save();
      throw new BadRequestException('Invitation has expired');
    }

    return invitation;
  }

  async cancelInvitation(invitationId: string, userId: Types.ObjectId): Promise<void> {
    const invitation = await this.invitationModel.findById(invitationId).populate('organizationId');

    if (!invitation) {
      throw new NotFoundException('Invitation not found');
    }

    // Check permissions - only inviter or organization admin/owner can cancel
    const organization = invitation.organizationId as unknown as OrganizationDocument;
    const membership = await this.membershipModel.findOne({
      userId,
      organizationId: organization._id,
      status: 'active'
    });

    const canCancel = invitation.invitedBy.toString() === userId.toString() ||
                      (membership && ['owner', 'admin'].includes(membership.role));

    if (!canCancel) {
      throw new BadRequestException('You do not have permission to cancel this invitation');
    }

    invitation.status = 'cancelled';
    await invitation.save();
  }

  async getOrganizationInvitations(organizationId: string): Promise<InvitationDocument[]> {
    return await this.invitationModel.find({
      organizationId,
      status: { $in: ['pending', 'accepted'] }
    }).populate('invitedBy', 'name email').sort({ createdAt: -1 });
  }
}