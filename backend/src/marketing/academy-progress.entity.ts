import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Index,
} from "typeorm";

/**
 * Server-side progress ledger for the Academy curriculum (public schema).
 *
 * One row per learner identity:
 *   • `userId`    → authenticated user (signed-in visits on /docs + /training)
 *   • `visitorId` → anonymous visitor (cookie-tagged visits on public /training)
 * Exactly one of the two is set per row (partial-unique indexes enforce it).
 *
 * `ledger` is the full `{ [lessonSlug]: LessonProgress }` map, stored as
 * jsonb. The client keeps the same shape in localStorage and treats this
 * table as the durable source of truth when reachable — it also powers the
 * certificate codes (`SF-<PATH>-<seq>-<hash8>`) on honest completion.
 */
@Entity({ name: "academy_progress", schema: "public" })
export class AcademyProgressEntity {
  @PrimaryGeneratedColumn("uuid")
  id!: string;

  @Index()
  @Column({ type: "uuid", nullable: true })
  userId!: string | null;

  @Index()
  @Column({ type: "varchar", length: 128, nullable: true })
  visitorId!: string | null;

  @Column({ type: "jsonb", default: () => "'{}'::jsonb" })
  ledger!: Record<string, unknown>;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  createdAt!: Date;

  @Column({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  updatedAt!: Date;
}