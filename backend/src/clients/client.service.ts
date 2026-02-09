import { Injectable, NotFoundException, Inject, ConflictException, InternalServerErrorException, Logger } from '@nestjs/common';
import { Repository, IsNull } from 'typeorm';
import { ClientEntity } from './client.entity';
import { CreateClientDto, UpdateClientDto } from './client.dto';
import { ClsService } from 'nestjs-cls';

@Injectable()
export class ClientService {
  private readonly logger = new Logger(ClientService.name);

  constructor(
    @Inject('CLIENT_REPOSITORY')
    private readonly clientRepository: Repository<ClientEntity>,
    private readonly cls: ClsService,
  ) {}

  /**
   * Create a new client with duplicate name validation and audit logging
   */
  async create(createClientDto: CreateClientDto): Promise<ClientEntity> {
    const tenantId = this.cls.get('tenant_id');
    
    // Check for duplicate name within tenant (excluding soft-deleted)
    const existingClient = await this.clientRepository.findOne({
      where: { 
        tenant_id: tenantId, 
        name: createClientDto.name,
        deleted_at: IsNull()
      },
    });

    if (existingClient) {
      this.logger.warn(`Attempt to create duplicate client name: "${createClientDto.name}" for tenant: ${tenantId}`);
      throw new ConflictException(
        `A client with the name "${createClientDto.name}" already exists. Please choose a different name.`
      );
    }

    try {
      const client = this.clientRepository.create({
        ...createClientDto,
        tenant_id: tenantId,
      });
      
      const savedClient = await this.clientRepository.save(client);
      this.logger.log(`Client created successfully: ${savedClient.id} - "${savedClient.name}" for tenant: ${tenantId}`);
      
      return savedClient;
    } catch (error: any) {
      // Handle database-level unique constraint violations
      if (error.code === '23505') {
        throw new ConflictException('A client with this name already exists');
      }
      
      this.logger.error(`Failed to create client: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to create client. Please try again.');
    }
  }

  /**
   * Find all active (non-deleted) clients for the current tenant
   */
  async findAll(): Promise<ClientEntity[]> {
    const tenantId = this.cls.get('tenant_id');
    
    return this.clientRepository.find({
      where: { 
        tenant_id: tenantId,
        deleted_at: IsNull() // Exclude soft-deleted clients
      },
      order: { name: 'ASC' },
    });
  }

  /**
   * Find a specific client by ID with tenant isolation
   */
  async findOne(id: string): Promise<ClientEntity> {
    const tenantId = this.cls.get('tenant_id');
    
    const client = await this.clientRepository.findOne({
      where: { 
        id, 
        tenant_id: tenantId,
        deleted_at: IsNull() // Exclude soft-deleted clients
      },
    });

    if (!client) {
      throw new NotFoundException(`Client with ID "${id}" not found or has been deleted`);
    }

    return client;
  }

  /**
   * Update an existing client with duplicate name validation
   */
  async update(id: string, updateClientDto: UpdateClientDto): Promise<ClientEntity> {
    const client = await this.findOne(id);
    const tenantId = this.cls.get('tenant_id');

    // If name is being updated, check for duplicates
    if (updateClientDto.name && updateClientDto.name !== client.name) {
      const existingWithName = await this.clientRepository.findOne({
        where: {
          tenant_id: tenantId,
          name: updateClientDto.name,
          deleted_at: IsNull()
        },
      });

      if (existingWithName && existingWithName.id !== id) {
        throw new ConflictException(
          `Another client with the name "${updateClientDto.name}" already exists. Please choose a different name.`
        );
      }
    }

    try {
      Object.assign(client, updateClientDto);
      const updated = await this.clientRepository.save(client);
      
      this.logger.log(`Client updated: ${updated.id} - "${updated.name}"`);
      return updated;
    } catch (error: any) {
      if (error.code === '23505') {
        throw new ConflictException('A client with this name already exists');
      }
      
      this.logger.error(`Failed to update client ${id}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to update client');
    }
  }

  /**
   * Soft delete a client (preserves data for audit trail)
   */
  async remove(id: string): Promise<void> {
    const client = await this.findOne(id);
    const tenantId = this.cls.get('tenant_id');

    // Soft delete: set deleted_at timestamp instead of removing record
    client.deleted_at = new Date();
    await this.clientRepository.save(client);

    this.logger.log(`Client soft-deleted: ${id} - "${client.name}" for tenant: ${tenantId}`);
  }
}
