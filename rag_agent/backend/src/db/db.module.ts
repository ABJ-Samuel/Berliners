import { Global, Module } from '@nestjs/common';
import { DbService } from './db.service';
import { MigrationRunner } from './migration.runner';

@Global()
@Module({
  providers: [DbService, MigrationRunner],
  exports: [DbService, MigrationRunner],
})
export class DbModule {}
