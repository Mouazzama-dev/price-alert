import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity()
export class CryptoPrice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  chain: string;

  @Column('double')
  price: number;

  @Column('timestamp')
  timestamp: Date;
}
