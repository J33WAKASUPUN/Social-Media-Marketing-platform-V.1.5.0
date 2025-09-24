/* eslint-disable prettier/prettier */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/restrict-template-expressions */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable, NotFoundException, ConflictException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Organization, OrganizationDocument } from './schemas/organization.schema';
import { Membership, MembershipDocument, getDefaultPermissions } from './schemas/membership.schema';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';
import { InviteMemberDto } from './dto/invite-member.dto';
import { UpdateMemberDto } from './dto/update-member.dto';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OrganizationsService {
  private readonly logger = new Logger(OrganizationsService.name);

  constructor(
    @InjectModel(Organization.name) private organizationModel: Model<OrganizationDocument>,
    @InjectModel(Membership.name) private membershipModel: Model<MembershipDocument>,
    private emailService: EmailService,
    private usersService: UsersService,
  ) {}

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  private async ensureUniqueSlug(baseSlug: string): Promise<string> {
    let slug = baseSlug;
    let counter = 1;

    while (await this.organizationModel.findOne({ slug })) {
      slug = `${baseSlug}-${counter}`;
      counter++;
    }

    return slug;
  }

  private addAuditLog(organization: OrganizationDocument, action: string, userId: Types.ObjectId, metadata: any = {}) {
    organization.auditLog.push({
      action,
      userId,
      timestamp: new Date(),
      metadata
    });
  }

  async create(createOrganizationDto: CreateOrganizationDto, userId: Types.ObjectId): Promise<OrganizationDocument> {
    try {
      // Check if organization name already exists
      const existingOrg = await this.organizationModel.findOne({ 
        name: createOrganizationDto.name
      });
      
      if (existingOrg) {
        throw new ConflictException('Organization name already exists');
      }

      // Generate unique slug
      const baseSlug = this.generateSlug(createOrganizationDto.name);
      const slug = await this.ensureUniqueSlug(baseSlug);

      // Create organization with default settings
      const organization = new this.organizationModel({
        ...createOrganizationDto,
        slug,
        ownerId: userId,
        settings: {
          timezone: 'UTC',
          dateFormat: 'MM/DD/YYYY',
          language: 'en',
          currency: 'USD',
          features: {
            analytics: true,
            scheduling: true,
            teamCollaboration: true,
            customBranding: false,
            apiAccess: false,
          },
          limits: {
            maxBrands: 5,
            maxUsers: 10,
            maxPostsPerMonth: 1000,
            maxSocialAccounts: 25,
          },
          ...createOrganizationDto.settings,
        },
        subscription: {
          planId: 'free',
          planName: 'Free Plan',
          status: 'active',
          startDate: new Date(),
          billingCycle: 'monthly',
          amount: 0,
          currency: 'USD',
          autoRenew: true,
          metadata: {}
        }
      });

      this.addAuditLog(organization, 'organization_created', userId, {
        organizationName: createOrganizationDto.name
      });

      const savedOrganization = await organization.save();

      // Create owner membership with proper permissions
      const ownerMembership = new this.membershipModel({
        userId: userId, // Ensure userId is set
        organizationId: savedOrganization._id,
        role: 'owner',
        status: 'active',
        joinedAt: new Date(),
        lastAccessAt: new Date(),
        permissions: getDefaultPermissions('owner') // Set permissions explicitly
      });

      await ownerMembership.save();
      this.logger.log(`Created organization ${savedOrganization.name} with owner ${userId}`);

      return savedOrganization;
    } catch (error) {
      this.logger.error('Error creating organization:', error);
      throw error;
    }
  }

  async findUserOrganizations(userId: Types.ObjectId): Promise<OrganizationDocument[]> {
    const memberships = await this.membershipModel
      .find({ userId, status: 'active' })
      .populate({
        path: 'organizationId',
        select: '-auditLog'
      })
      .exec();

    return memberships
      .filter(membership => membership.organizationId)
      .map(membership => membership.organizationId as unknown as OrganizationDocument);
  }

  async findOne(id: string, userId: Types.ObjectId): Promise<OrganizationDocument> {
    const organization = await this.organizationModel
      .findById(id)
      .select('-auditLog')
      .exec();

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user has access to this organization
    const membership = await this.membershipModel.findOne({
      userId,
      organizationId: organization._id,
      status: 'active'
    });

    if (!membership) {
      throw new ForbiddenException('Access denied to this organization');
    }

    return organization;
  }

  async update(id: string, updateOrganizationDto: UpdateOrganizationDto, userId: Types.ObjectId): Promise<OrganizationDocument> {
    const organization = await this.organizationModel.findById(id);
    
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check permissions
    const membership = await this.membershipModel.findOne({
      userId,
      organizationId: organization._id,
      status: 'active'
    });

    if (!membership || !membership.permissions.organizations.update) {
      throw new ForbiddenException('Insufficient permissions to update organization');
    }

    // Check if name is being changed and if it's unique
    if (updateOrganizationDto.name && updateOrganizationDto.name !== organization.name) {
      const existingOrg = await this.organizationModel.findOne({
        name: updateOrganizationDto.name,
        _id: { $ne: organization._id }
      });

      if (existingOrg) {
        throw new ConflictException('Organization name already exists');
      }

      // Update slug if name changed
      const baseSlug = this.generateSlug(updateOrganizationDto.name);
      const slug = await this.ensureUniqueSlug(baseSlug);
      (updateOrganizationDto as any).slug = slug;
    }

    // Merge settings
    if (updateOrganizationDto.settings) {
      updateOrganizationDto.settings = {
        ...organization.settings,
        ...updateOrganizationDto.settings
      };
    }

    this.addAuditLog(organization, 'organization_updated', userId, {
      changes: updateOrganizationDto
    });

    Object.assign(organization, updateOrganizationDto);
    return await organization.save();
  }

  async remove(id: string, userId: Types.ObjectId): Promise<void> {
    const organization = await this.organizationModel.findById(id);
    
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Only owner can delete organization
    if (organization.ownerId.toString() !== userId.toString()) {
      throw new ForbiddenException('Only organization owner can delete the organization');
    }

    // Delete organization and all memberships
    await organization.deleteOne();
    await this.membershipModel.deleteMany({ organizationId: organization._id });
  }

  async getMembers(organizationId: string, userId: Types.ObjectId): Promise<MembershipDocument[]> {
    const organization = await this.organizationModel.findById(organizationId);
    
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Check if user has access
    const userMembership = await this.membershipModel.findOne({
      userId,
      organizationId: organization._id,
      status: 'active'
    });

    if (!userMembership) {
      throw new ForbiddenException('Access denied to this organization');
    }

    return await this.membershipModel
      .find({ organizationId: organization._id })
      .populate('userId', 'name email avatar')
      .populate('invitedBy', 'name email')
      .sort({ role: 1, createdAt: -1 })
      .exec();
  }

  async inviteMember(organizationId: string, inviteMemberDto: InviteMemberDto, userId: Types.ObjectId): Promise<any> {
    try {
      const organization = await this.organizationModel.findById(organizationId);
      
      if (!organization) {
        throw new NotFoundException('Organization not found');
      }

      // Check permissions
      const userMembership = await this.membershipModel.findOne({
        userId,
        organizationId: organization._id,
        status: 'active'
      });

      if (!userMembership || !userMembership.permissions.members.invite) {
        throw new ForbiddenException('Insufficient permissions to invite members');
      }

      // Check if user exists
      let invitedUser = null;
      try {
        invitedUser = await this.usersService.findByEmail(inviteMemberDto.email);
      } catch (error) {
        // User doesn't exist, that's okay for invitations
        this.logger.log(`User with email ${inviteMemberDto.email} not found, sending invitation for new user`);
      }
      
      if (invitedUser) {
        // Check if user is already a member
        const existingMembership = await this.membershipModel.findOne({
          userId: invitedUser._id,
          organizationId: organization._id
        });

        if (existingMembership) {
          throw new ConflictException('User is already a member of this organization');
        }
      }

      // Check organization limits
      const currentMemberCount = await this.membershipModel.countDocuments({
        organizationId: organization._id,
        status: { $in: ['active', 'pending'] }
      });

      if (currentMemberCount >= organization.settings.limits.maxUsers) {
        throw new BadRequestException('Organization has reached maximum user limit');
      }

      // Create invitation token
      const invitationToken = uuidv4();
      
      // Get inviter details for email
      const inviter = await this.usersService.findById(userId.toString());
      
      // Send invitation email
      const emailSent = await this.emailService.sendInvitationEmail(
        inviteMemberDto.email,
        organization.name,
        inviter.name,
        invitationToken,
        inviteMemberDto.message
      );

      if (!emailSent) {
        this.logger.warn(`Failed to send invitation email to ${inviteMemberDto.email}, but invitation created`);
      }

      this.addAuditLog(organization, 'member_invited', userId, {
        email: inviteMemberDto.email,
        role: inviteMemberDto.role
      });

      await organization.save();

      return {
        email: inviteMemberDto.email,
        role: inviteMemberDto.role,
        invitationToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        message: 'Invitation sent successfully'
      };
    } catch (error) {
      this.logger.error(`Error inviting member: ${error.message}`, error.stack);
      throw error;
    }
  }

  async updateMember(organizationId: string, memberId: string, updateMemberDto: UpdateMemberDto, userId: Types.ObjectId): Promise<MembershipDocument> {
    const organization = await this.organizationModel.findById(organizationId);
    
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const membership = await this.membershipModel.findOne({
      _id: memberId,
      organizationId: organization._id
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    // Check permissions
    const userMembership = await this.membershipModel.findOne({
      userId,
      organizationId: organization._id,
      status: 'active'
    });

    if (!userMembership || !userMembership.permissions.members.manage) {
      throw new ForbiddenException('Insufficient permissions to update member');
    }

    // Cannot change owner role
    if (membership.role === 'owner') {
      throw new ForbiddenException('Cannot modify organization owner');
    }

    // Cannot promote to owner
    if (updateMemberDto.role === 'owner') {
      throw new ForbiddenException('Cannot promote member to owner');
    }

    this.addAuditLog(organization, 'member_updated', userId, {
      memberId: membership._id,
      changes: updateMemberDto
    });

    Object.assign(membership, updateMemberDto);
    await organization.save();

    return await membership.save();
  }

  async removeMember(organizationId: string, memberId: string, userId: Types.ObjectId): Promise<void> {
    const organization = await this.organizationModel.findById(organizationId);
    
    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    const membership = await this.membershipModel.findOne({
      _id: memberId,
      organizationId: organization._id
    });

    if (!membership) {
      throw new NotFoundException('Member not found');
    }

    // Cannot remove owner
    if (membership.role === 'owner') {
      throw new ForbiddenException('Cannot remove organization owner');
    }

    // Check permissions
    const userMembership = await this.membershipModel.findOne({
      userId,
      organizationId: organization._id,
      status: 'active'
    });

    if (!userMembership || !userMembership.permissions.members.remove) {
      throw new ForbiddenException('Insufficient permissions to remove member');
    }

    this.addAuditLog(organization, 'member_removed', userId, {
      memberId: membership._id,
      memberUserId: membership.userId
    });

    await membership.deleteOne();
    await organization.save();
  }
}