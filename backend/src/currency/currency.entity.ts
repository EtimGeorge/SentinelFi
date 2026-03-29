import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";

@Entity({ name: "currency_exchange_rates", schema: "public" })
@Index(["fromCurrency", "toCurrency", "lastUpdated"], { unique: true })
export class CurrencyExchangeRateEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ name: "from_currency", type: "varchar", length: 3 })
  fromCurrency!: string; // e.g., 'USD'

  @Column({ name: "to_currency", type: "varchar", length: 3 })
  toCurrency!: string; // e.g., 'NGN', 'EUR'

  @Column({ type: "decimal", precision: 18, scale: 6 })
  rate!: number; // Exchange rate

  @Column({ name: "last_updated", type: "timestamp" })
  lastUpdated!: Date;

  @Column({ type: "varchar", length: 100, nullable: true })
  source?: string; // API source name (e.g., 'ExchangeRate-API')

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}

@Entity({ name: "currency_metadata", schema: "public" })
export class CurrencyMetadataEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Column({ unique: true, type: "varchar", length: 3 })
  code!: string; // e.g., 'USD'

  @Column({ type: "varchar", length: 50 })
  name!: string; // e.g., 'US Dollar'

  @Column({ type: "varchar", length: 10 })
  symbol!: string; // e.g., '$'

  @Column({ name: "is_active", type: "boolean", default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: "created_at" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at" })
  updatedAt!: Date;
}
