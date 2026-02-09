import { Module } from '@nestjs/common';
import { ClientService } from './client.service';
import { ClientController } from './client.controller';
import { TENANT_DATA_SOURCE } from '../database/constants';
import { DataSource } from 'typeorm';
import { ClientEntity } from './client.entity';

@Module({
  controllers: [ClientController],
  providers: [
    {
      provide: 'CLIENT_REPOSITORY',
      useFactory: (dataSource: DataSource) => dataSource.getRepository(ClientEntity),
      inject: [TENANT_DATA_SOURCE],
    },
    ClientService,
  ],
  exports: [ClientService, 'CLIENT_REPOSITORY'],
})
export class ClientModule {}
