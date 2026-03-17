import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { InvitationEntity } from './entities/invitation.entity';
import { EmailService } from '../email/email.service';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { Role } from '@shared/types/role.enum';
import { TenantEntity } from '../tenants/tenant.entity';

@Injectable()
export class InvitationService {
  private readonly logger = new Logger(InvitationService.name);

  constructor(
    @InjectRepository(InvitationEntity)
    private readonly invitationRepository: Repository<InvitationEntity>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private readonly dataSource: DataSource,
  ) {}

  async createInvitation(email: string, role: Role, tenant: TenantEntity, firstName?: string, lastName?: string): Promise<InvitationEntity> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 48); // 48 hour expiry

    const invitation = this.invitationRepository.create({
      token,
      email,
      role,
      tenant,
      first_name: firstName,
      last_name: lastName,
      expires_at: expiresAt,
    });

    const savedInvite = await this.invitationRepository.save(invitation);

    // Send the email
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const inviteUrl = `${frontendUrl}/auth/accept-invitation?token=${token}`;

    try {
      await this.emailService.sendTemplatedEmail(email, `Invitation to join ${tenant.name} on SentinelFi`, 'invitation', {
        tenantName: tenant.name,
        inviteUrl,
        expiryHours: 48,
      });
    } catch (err) {
      this.logger.error(`Failed to send invitation email to ${email}`, err);
    }

    return savedInvite;
  }

  async validateToken(token: string): Promise<InvitationEntity> {
    const invitation = await this.invitationRepository.findOne({
      where: { token, is_consumed: false },
      relations: ['tenant'],
    });

    if (!invitation) {
      throw new NotFoundException('Invalid or expired invitation token.');
    }

    if (new Date() > invitation.expires_at) {
      throw new BadRequestException('Invitation token has expired.');
    }

    return invitation;
  }

  async markAsConsumed(token: string): Promise<void> {
    await this.invitationRepository.update({ token }, { is_consumed: true });
  }
}
