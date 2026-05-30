import { Injectable } from '@nestjs/common';
import { Env, parseEnv } from './env';

@Injectable()
export class EnvService {
  readonly env: Env;

  constructor() {
    this.env = parseEnv(process.env);
  }
}
