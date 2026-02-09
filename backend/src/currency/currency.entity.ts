import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('currency_exchange_rates')
@Index(['fromCurrency', 'toCurrency', 'lastUpdated'], { unique: true })
export class CurrencyExchangeRateEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'from_currency', type: 'varchar', length: 3 })
  fromCurrency!: string; // e.g., 'USD'

  @Column({ name: 'to_currency', type: 'varchar', length: 3 })
  toCurrency!: string; // e.g., 'NGN', 'EUR'

  @Column({ type: 'decimal', precision: 18, scale: 6 })
  rate!: number; // Exchange rate

  @Column({ name: 'last_updated', type: 'timestamp' })
  lastUpdated!: Date;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source?: string; // API source name (e.g., 'ExchangeRate-API')

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
